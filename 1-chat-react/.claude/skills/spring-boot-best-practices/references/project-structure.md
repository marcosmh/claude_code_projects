# Project structure

Base package: `com.markcode.claude.springboot.{artifactId}.app` (hyphens in the artifactId are dropped or replaced by `_` in the package; the pom keeps the original). Example for artifactId `demo-api`:

```
demo-api/
├── .mvn/                       Maven Wrapper
├── mvnw
├── mvnw.cmd
├── pom.xml
├── CLAUDE.md
└── src/
    ├── main/
    │   ├── java/com/markcode/claude/springboot/demoapi/app/
    │   │   ├── DemoApiApplication.java      @SpringBootApplication, nothing else
    │   │   ├── config/                      SecurityConfig, CorsConfig, AppProperties (all Spring/Security config)
    │   │   ├── controllers/                 UserController, ApiExceptionHandler
    │   │   ├── services/                    UserService
    │   │   ├── repositories/                UserRepository
    │   │   ├── models/                      User (JPA entity)
    │   │   ├── dto/                         UserDto (record)
    │   │   ├── mapper/                      UserMapper
    │   │   └── exceptions/                  ResourceNotFoundException, BusinessRuleException
    │   └── resources/
    │       ├── application.properties
    │       ├── static/                      (MVC apps) css/app.css, images
    │       └── templates/                   (MVC apps) layouts/, fragments/, pages/
    └── test/java/.../app/                   mirrors main packages
```

## Rules

- The `@SpringBootApplication` class sits in the **root** `app` package so component scanning covers every sub-package. Never put it in a sub-package.
- One package per responsibility, one top-level type per file. Group by layer, not by feature, unless the project has grown past ~10 entities; then propose a feature-based split to the user before doing it.
- Naming: `XController`, `XService`, `XRepository`, `X` (entity), `XDto`, `XMapper`. In MVC apps, name page controllers `XPageController` to separate them from REST controllers.
- Tests mirror the main package and use the slice that matches the layer (`@WebMvcTest`, `@DataJpaTest`, plain JUnit for services and mappers).
- Dependency direction is one-way: `controllers -> services -> repositories`, and `services -> mapper`; `config -> services` only through interfaces (e.g. `UserDetailsService`). `models` and `dto` depend on nothing in the app. Flag any import that breaks this when reviewing.
- `config/` holds every Spring and Spring Security configuration class (see `config-security.md`); it is created with the project, even when empty. Use a `config/security/` subpackage once JWT classes appear. Layers do not import from `config/` except typed properties records.
- `exceptions/` holds domain exceptions thrown by services; `ApiExceptionHandler` in `controllers/` translates them to HTTP.
