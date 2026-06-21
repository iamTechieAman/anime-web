# Contributing to ToonPlayer

First off, thank you for considering contributing to **ToonPlayer**! 🎉 
It's people like you that make ToonPlayer such a great streaming platform for everyone. 

The following is a set of guidelines for contributing to ToonPlayer. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

---

## 🧭 Code of Conduct

This project and everyone participating in it is governed by the [ToonPlayer Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## 💡 How Can I Contribute?

### 🐛 Reporting Bugs

This section guides you through submitting a bug report for ToonPlayer. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

1. **Check existing issues** to see if the bug has already been reported.
2. Use the **Bug Report Issue Template** provided in the repository.
3. **Provide a clear, descriptive title** for the issue.
4. **Describe the exact steps** which reproduce the problem in as many details as possible.
5. **Provide screenshots or videos** if applicable. Console errors from the browser's developer tools are incredibly helpful!

### ✨ Suggesting Enhancements

If you have an idea for a new feature or an improvement to an existing one, please open an issue using the **Feature Request Template**.

*   Clearly explain **why** the enhancement would be useful to most ToonPlayer users.
*   Provide a mockup or visual reference if it's a UI/UX change.

### 🛠️ Pull Requests

The process described here has several goals:
- Maintain ToonPlayer's high standard of code quality and cinematic UI/UX.
- Fix problems that are important to users.
- Enable a sustainable ecosystem for developers.

**Steps:**
1. **Fork the repo** and create your branch from `main`.
2. **Clone** your fork locally: `git clone https://github.com/your-username/anime-web.git`
3. **Install dependencies**: `npm install`
4. If you've added code that should be tested, add tests.
5. If you've changed APIs, update the documentation.
6. Ensure the test suite passes (`npm run build` / `npm run lint`).
7. Create a Pull Request using the standard **PR Template**.

---

## 🎨 Styleguides

### 📝 Git Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
*   `feat: ` (new feature for the user, not a new feature for build script)
*   `fix: ` (bug fix for the user, not a fix to a build script)
*   `docs: ` (changes to the documentation)
*   `style: ` (formatting, missing semi colons, etc; no production code change)
*   `refactor: ` (refactoring production code, eg. renaming a variable)
*   `test: ` (adding missing tests, refactoring tests; no production code change)
*   `chore: ` (updating grunt tasks etc; no production code change)

### 💻 TypeScript & React Styleguide

*   Use `PascalCase` for React components, interfaces, and types.
*   Use `camelCase` for variables and helper functions.
*   Prefer functional components with React Hooks.
*   Use Tailwind CSS strictly for styling. Avoid custom CSS unless absolutely necessary (add to `globals.css` using CSS variables for theming).
*   Always type props using TypeScript `interface`. Avoid `any`.
*   Ensure all new components are documented with concise JSDoc comments.

---

## ❓ Questions?

If you have any questions, feel free to open a Discussion on GitHub or reach out to the core maintainers. Thank you for making ToonPlayer awesome!
