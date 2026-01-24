# Contributing to ToonPlayer 🎬

First off, thanks for taking the time to contribute! ❤️

All types of contributions are encouraged and valued. Whether it's a bug report, feature request, documentation improvement, or code contribution - we appreciate your help in making ToonPlayer better!

## Table of Contents

- [I Have a Question](#i-have-a-question)
- [I Want to Contribute](#i-want-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
  - [Commit Messages](#commit-messages)
  - [Code Style](#code-style)

## I Have a Question

Before you ask a question, please search for existing [Issues](https://github.com/iamTechieAman/anime-web/issues) to see if someone has already asked it.

If you still need clarification:
- Open an [Issue](https://github.com/iamTechieAman/anime-web/issues/new)
- Provide as much context as possible
- Include screenshots if relevant

## I Want to Contribute

### Reporting Bugs

#### Before Submitting a Bug Report

- Make sure you're using the latest version
- Check if your bug has already been reported in [Issues](https://github.com/iamTechieAman/anime-web/issues)
- Collect information about the bug:
  - Browser and version
  - Device (mobile/desktop)
  - Console errors (if any)
  - Steps to reproduce

#### How to Submit a Good Bug Report

Use the **Bug Report** template when creating an issue. Be clear and descriptive:

- **Use a clear title** that describes the problem
- **Describe exact steps** to reproduce the issue
- **Provide specific examples** (URLs, screenshots, error messages)
- **Describe what you expected** vs what actually happened
- **Include environment details** (browser, OS, device)

### Suggesting Features

#### Before Submitting a Feature Request

- Check if the feature already exists
- Make sure it aligns with the project's scope
- Search existing [Issues](https://github.com/iamTechieAman/anime-web/issues) for similar suggestions

#### How to Submit a Good Feature Request

Use the **Feature Request** template and:

- **Use a clear title** describing the feature
- **Provide a detailed description** of the suggested enhancement
- **Explain why this would be useful** to users
- **Provide examples** of how it would work
- **Include mockups/screenshots** if applicable

### Your First Code Contribution

#### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/anime-web.git
   cd anime-web
   ```

3. **Install dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```

4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

#### Branch Naming Conventions

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `style/description` - UI/styling changes

Examples:
- `feature/add-watch-history`
- `fix/video-playback-error`
- `docs/update-readme`

### Pull Request Process

1. **Make your changes** following our [style guidelines](#style-guidelines)

2. **Test thoroughly**:
   - Ensure the app runs without errors
   - Test on both desktop and mobile (if applicable)
   - Check browser console for errors

3. **Commit your changes** with clear messages:
   ```bash
   git add .
   git commit -m "feat: add watch history feature"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**:
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template completely
   - Link any related issues (e.g., "Closes #123")

6. **Wait for review**:
   - Respond to any feedback
   - Make requested changes
   - Be patient and respectful

## Style Guidelines

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

**Format**: `type(scope): description`

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, missing semicolons, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples**:
```bash
feat(player): add keyboard shortcuts for video control
fix(search): resolve infinite scroll bug on mobile
docs(readme): update installation instructions
style(ui): improve responsive layout on tablet
refactor(api): simplify video source fetching logic
```

### Code Style

- **TypeScript**: Use TypeScript for type safety
- **Formatting**: Code will be formatted automatically (if you set up Prettier)
- **Components**: Use functional components with hooks
- **Naming**:
  - Components: PascalCase (`VideoPlayer.tsx`)
  - Files: kebab-case for utilities (`video-utils.ts`)
  - Variables/Functions: camelCase (`getVideoUrl`)
- **Comments**: Write clear comments for complex logic
- **CSS**: Use Tailwind utility classes when possible

#### React Best Practices

```tsx
// ✅ Good
const WatchPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  return <div>...</div>;
};

// ❌ Avoid
const watch = () => {
  var loading = false;
  return <div>...</div>;
};
```

## Questions?

Feel free to reach out:
- Open an issue for questions
- Check existing discussions
- Review the [README](README.md) and [JOURNEY](JOURNEY.md) docs

---

Thank you for contributing! 🚀

**Built with ❤️ by the community**
