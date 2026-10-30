# pom.xml template

Reference `pom.xml` for the baseline in `SKILL.md`. It mirrors what Spring Initializr generated for Spring Boot 4.1.2 + Java 25 (verified: `./mvnw -DskipTests package` builds). Prefer regenerating from Initializr; use this when it is unreachable, and **re-check the starter names against the Boot version you pick** (Boot 4 renamed several, e.g. `spring-boot-starter-webmvc`, and added per-starter `*-test` artifacts).

Replace `{artifactId}` with the workspace directory name and `{bootVersion}` with the verified stable version.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>{bootVersion}</version>
    <relativePath/>
  </parent>

  <groupId>com.markcode.claude.springboot</groupId>
  <artifactId>{artifactId}</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <name>{artifactId}</name>
  <packaging>jar</packaging>

  <properties>
    <java.version>25</java.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-webmvc</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <dependency>
      <groupId>com.h2database</groupId>
      <artifactId>h2</artifactId>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-h2console</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-devtools</artifactId>
      <scope>runtime</scope>
      <optional>true</optional>
    </dependency>

    <!-- Test starters (Boot 4 ships one per feature) -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-webmvc-test</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa-test</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation-test</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-actuator-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
```

## Variants

- **Thymeleaf monolith:** add `spring-boot-starter-thymeleaf` (and `spring-boot-starter-thymeleaf-test` in test scope).
- **No H2 console:** drop `spring-boot-h2console`.
- Do not add MapStruct, Lombok or other generators unless the user asks.

## application.properties (never YAML)

```properties
spring.application.name={artifactId}
spring.datasource.url=jdbc:h2:mem:{artifactId};DB_CLOSE_DELAY=-1
spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false
management.endpoints.web.exposure.include=health,info
```

`open-in-view=false` keeps lazy loading out of the controller layer, which matches the rule that entities never leave the service.

## Maven Wrapper

`.mvn/`, `mvnw` and `mvnw.cmd` come with Initializr. Otherwise run `mvn wrapper:wrapper`, then `chmod +x mvnw`. Always run the build as `./mvnw ...`.
