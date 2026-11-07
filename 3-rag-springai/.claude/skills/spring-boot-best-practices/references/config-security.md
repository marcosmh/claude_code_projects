# Configuration package (`config/`) and Spring Security

All Spring configuration lives in **one package**, `config/`, under the base package. That includes Spring Security. The reason: wiring (beans, filter chains, CORS, JPA auditing, properties binding) is cross-cutting; keeping it in one place means a reader finds "how is this app assembled" in a single folder and the layers (`controllers`, `services`, ...) stay free of framework setup.

## Contents
- What goes in config/
- Rules
- Spring Security setup
- CORS
- Typed properties
- Other configuration
- Tests

## What goes in `config/`

```
config/
├── SecurityConfig.java        SecurityFilterChain, PasswordEncoder, method security
├── CorsConfig.java            CorsConfigurationSource (or inside SecurityConfig if tiny)
├── AppProperties.java         @ConfigurationProperties record (app.* keys)
├── JpaConfig.java             @EnableJpaAuditing, entity scan tweaks (only if needed)
├── WebConfig.java             WebMvcConfigurer: formatters, resource handlers
├── JacksonConfig.java         ObjectMapper customizations (only if needed)
└── security/                  optional subpackage once security grows (JwtAuthenticationFilter,
                               JwtService, SecurityProblemHandlers, ...)
```

Create only the classes the project needs. An empty `config/` with a `package-info.java` is the correct starting point.

## Rules

- Classes here are `@Configuration` (or `@ConfigurationProperties`) and contain **wiring only**: beans, chains, bindings. No business rules, no repository calls.
- Security needs users? Implement `UserDetailsService` in `services/` (it may use a repository) and let `SecurityConfig` receive it by constructor injection. Config never reaches into `repositories/` directly.
- Dependency direction: `config -> services` (through interfaces such as `UserDetailsService`). Nothing in `controllers`, `services`, `repositories`, `models`, `dto` or `mapper` imports from `config`, except typed properties records (`AppProperties`) that services may inject.
- Constructor injection; `@Bean` methods are `public` (or package-private) and small. Prefer one `SecurityFilterChain` bean over several unless there are truly separate URL spaces (e.g. `/api/**` stateless and a Thymeleaf UI with sessions).
- Secrets (JWT signing key, DB passwords) come from environment variables referenced in `application.properties` (`app.security.jwt.secret=${JWT_SECRET}`), never hard-coded or committed.
- Configuration stays in `application.properties`; profile overrides go in `application-<profile>.properties`.

## Spring Security setup

Add the starter when authentication is requested (Boot 4 names: `spring-boot-starter-security` and, in test scope, `spring-boot-starter-security-test`; verify against the Boot version in use). Adding it **locks every endpoint by default**, including Actuator, so add the matching rules in the same change.

Stateless REST API skeleton (Spring Security 7 lambda DSL; `and()` chaining and `WebSecurityConfigurerAdapter` no longer exist):

```java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http, CorsConfigurationSource cors) throws Exception {
        return http
                .cors(c -> c.configurationSource(cors))
                .csrf(AbstractHttpConfigurer::disable)            // stateless token API; keep CSRF on for cookie/session UIs
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .anyRequest().authenticated())
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}
```

Never store or compare plain-text passwords; the entity keeps the encoded hash and the DTO never carries it. For JWT, put the filter and token service in `config/security/`, register the filter with `addFilterBefore(..., UsernamePasswordAuthenticationFilter.class)`, and return 401/403 as `ProblemDetail` through an `AuthenticationEntryPoint` / `AccessDeniedHandler` so errors keep the shape defined by the exception advice.

For a Thymeleaf monolith use the session/form-login chain instead (CSRF enabled, `formLogin`, `logout`), and expose static assets (`/css/**`, `/images/**`) as `permitAll`.

## CORS

Needed once a browser frontend on another origin calls the API (the React app on `http://localhost:5173`). Allowed origins come from properties, not code:

```java
@Bean
CorsConfigurationSource corsConfigurationSource(AppProperties props) {
    CorsConfiguration cfg = new CorsConfiguration();
    cfg.setAllowedOrigins(props.cors().allowedOrigins());
    cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", cfg);
    return source;
}
```

Do not use `*` together with credentials. Without Spring Security, expose the same rules through `WebMvcConfigurer.addCorsMappings` in `WebConfig`.

## Typed properties

```java
@ConfigurationProperties(prefix = "app")
public record AppProperties(Cors cors) {
    public record Cors(List<String> allowedOrigins) {}
}
```

```properties
app.cors.allowed-origins=http://localhost:5173
```

Enable binding with `@ConfigurationPropertiesScan` on the application class (or `@EnableConfigurationProperties(AppProperties.class)` in a config class). Prefer this over scattered `@Value`.

## Other configuration

- JPA auditing for `createdAt`/`updatedAt`: `@EnableJpaAuditing` in `JpaConfig`, with `@EntityListeners(AuditingEntityListener.class)` on the entity. Those fields stay out of DTOs.
- Jackson, formatters, resource handlers: only when the defaults are insufficient.
- Profiles: `application-dev.properties` / `application-prod.properties`; do not branch on profiles inside business code.

## Tests

- Security slice: `@WebMvcTest` plus `@Import(SecurityConfig.class)`, use `spring-security-test` helpers (`@WithMockUser`, `jwt()`); assert 401 without credentials and 403 without the role.
- Check that Actuator health stays reachable unauthenticated if that is the rule.
