# Layer templates

Base package below is `com.markcode.claude.springboot.demo.app`; substitute the real one. Imports omitted for brevity except where non-obvious (Boot 4 uses `jakarta.*`).

## Contents
- Model
- Repository
- DTO
- Mapper
- Service
- Controller
- Error handling
- Tests

## Model (`models/User.java`)

```java
@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;      // never exposed in a DTO

    private Instant createdAt;    // server-managed, never exposed
    private Instant updatedAt;

    protected User() {}           // JPA

    public User(String name, String email) { this.name = name; this.email = email; }

    @PrePersist void onCreate() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate  void onUpdate() { updatedAt = Instant.now(); }

    // getters; setters only for fields that legitimately change
}
```

## Repository (`repositories/UserRepository.java`)

```java
public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String email);
    Optional<User> findByEmail(String email);
}
```

## DTO (`dto/UserDto.java`)

```java
public record UserDto(
        Long id,
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email String email) {}
```

## Mapper (`mapper/UserMapper.java`)

```java
@Component
public class UserMapper {
    public UserDto toDto(User entity) {
        return new UserDto(entity.getId(), entity.getName(), entity.getEmail());
    }

    public User toEntity(UserDto dto) {
        return new User(dto.name(), dto.email());
    }
}
```

## Service (`services/UserService.java`)

```java
@Service
public class UserService {
    private final UserRepository repository;
    private final UserMapper mapper;

    public UserService(UserRepository repository, UserMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<UserDto> findAll() {
        return repository.findAll().stream().map(mapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public UserDto findById(Long id) {
        return repository.findById(id).map(mapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("User " + id + " not found"));
    }

    @Transactional
    public UserDto create(UserDto dto) {
        if (repository.existsByEmail(dto.email())) {
            throw new BusinessRuleException("Email already registered");
        }
        return mapper.toDto(repository.save(mapper.toEntity(dto)));
    }
}
```

## Controller (`controllers/UserController.java`)

```java
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;

    public UserController(UserService service) { this.service = service; }

    @GetMapping
    public List<UserDto> findAll() { return service.findAll(); }

    @GetMapping("/{id}")
    public UserDto findById(@PathVariable Long id) { return service.findById(id); }

    @PostMapping
    public ResponseEntity<UserDto> create(@Valid @RequestBody UserDto dto) {
        UserDto created = service.create(dto);
        return ResponseEntity.created(URI.create("/api/users/" + created.id())).body(created);
    }
}
```

## Error handling (`controllers/ApiExceptionHandler.java`)

Map `ResourceNotFoundException` -> 404, `BusinessRuleException` -> 409/422 and `MethodArgumentNotValidException` -> 400 using `ProblemDetail`, so every error has one consistent shape.

```java
@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(ResourceNotFoundException.class)
    ProblemDetail notFound(ResourceNotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }
}
```

## Tests

- Service: plain JUnit + Mockito over the repository and a real mapper.
- Controller: `@WebMvcTest(UserController.class)` with `@MockitoBean UserService` (Boot 4 / Spring Framework 7 naming; older versions use `@MockBean`).
- Repository: `@DataJpaTest` against H2.
