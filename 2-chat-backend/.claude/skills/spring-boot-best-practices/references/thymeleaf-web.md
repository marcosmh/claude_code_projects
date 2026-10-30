# Spring MVC + Thymeleaf monolith

Use this when the app renders HTML on the server. Add the `thymeleaf` starter (Initializr dependency `thymeleaf`) to the baseline.

## Template layout

```
src/main/resources/templates/
├── layouts/
│   └── base.html
├── fragments/
│   ├── header.html
│   ├── navbar.html
│   └── footer.html
└── pages/
    └── home.html
```

`layouts/base.html` is the single shell every page reuses; pages plug their content into it so header, navbar and footer exist once:

```html
<!DOCTYPE html>
<html lang="en" xmlns:th="http://www.thymeleaf.org" th:fragment="layout(title, content)">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title th:replace="${title}">App</title>
  <link rel="stylesheet" th:href="@{/css/app.css}">
</head>
<body class="min-h-screen flex flex-col bg-slate-50 text-slate-900">
  <header th:replace="~{fragments/header :: header}"></header>
  <nav th:replace="~{fragments/navbar :: navbar}"></nav>
  <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
    <th:block th:replace="${content}"></th:block>
  </main>
  <footer th:replace="~{fragments/footer :: footer}"></footer>
</body>
</html>
```

A page:

```html
<html xmlns:th="http://www.thymeleaf.org"
      th:replace="~{layouts/base :: layout(~{::title}, ~{::section})}">
<head><title>Home</title></head>
<body>
  <section><h1 class="text-2xl font-semibold">Home</h1></section>
</body>
</html>
```

Each fragment file declares its own landmark with `th:fragment` (`<header th:fragment="header">`, `<nav th:fragment="navbar">`, `<footer th:fragment="footer">`). Use semantic HTML (`header`, `nav`, `main`, `footer`, headings in order) so the layout is accessible.

## UI requirements

Reusable base layout, shared header/navbar/footer, centered main content (`mx-auto max-w-*`), responsive (mobile-first utilities), views contain presentation only - no business logic, no repository calls.

## Tailwind CSS

Prefer the Tailwind standalone CLI (no Node needed) and output into `src/main/resources/static/css/app.css`:

```bash
# input: src/main/tailwind/input.css containing:  @import "tailwindcss"; @source "../resources/templates";
tailwindcss -i src/main/tailwind/input.css -o src/main/resources/static/css/app.css --minify
```

Check the current Tailwind docs for the standalone CLI install and the v4 `@source` syntax. Commit the generated CSS or build it in CI; mention which you chose. Add `./mvnw` instructions only for Java steps; the Tailwind build is a separate command.

## Controllers

```java
@Controller
@RequestMapping("/users")
public class UserPageController {
    private final UserService service;
    public UserPageController(UserService service) { this.service = service; }

    @GetMapping
    public String list(Model model) {
        model.addAttribute("users", service.findAll());   // DTOs, never entities
        return "pages/users";
    }
}
```

For forms, bind to a DTO (use a class with setters if a record cannot bind), validate with `@Valid` + `BindingResult`, redirect after a successful POST (Post/Redirect/Get).
