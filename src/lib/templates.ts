// Templates for commonly required GitHub repository files

export type FileTemplate = {
  filename: string;
  content: string;
  description: string;
}

export const fileTemplates: Record<string, FileTemplate> = {
  'README.md': {
    filename: 'README.md',
    description: 'Project documentation',
    content: `# Project Name

## Description
A brief description of what this project does and who it's for.

## Installation
\`\`\`bash
# Installation instructions
npm install my-project
\`\`\`

## Usage
\`\`\`javascript
// Example code
import { myFunction } from 'my-project';
myFunction();
\`\`\`

## Features
- Feature 1
- Feature 2
- Feature 3

## Contributing
Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to contribute to this project.

## License
This project is licensed under the [LICENSE](LICENSE) - see the file for details.

## Support
For support, please see our [Support Guide](SUPPORT.md).

## Security
For security issues, please see our [Security Policy](SECURITY.md).
`
  },
  'LICENSE': {
    filename: 'LICENSE',
    description: 'License information',
    content: `MIT License

Copyright (c) ${new Date().getFullYear()} [Your Name or Organization]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
  },
  'CONTRIBUTING.md': {
    filename: 'CONTRIBUTING.md',
    description: 'Contribution guidelines',
    content: `# Contributing to [Project Name]

Thank you for considering contributing to this project! We welcome contributions from everyone.

## Code of Conduct
Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs
- Check if the bug has already been reported
- Use the bug report template
- Include detailed steps to reproduce the bug
- Include any relevant logs or screenshots

### Suggesting Features
- Check if the feature has already been suggested
- Use the feature request template
- Describe the feature in detail and why it would be valuable

### Pull Requests
1. Fork the repository
2. Create a new branch (\`git checkout -b feature/amazing-feature\`)
3. Make your changes
4. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
5. Push to the branch (\`git push origin feature/amazing-feature\`)
6. Open a Pull Request

## Style Guides

### Git Commit Messages
- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### Code Style
- Follow the existing code style
- Document new code based on the project's documentation standards
- Write tests for new features or bug fixes

## Thank You!
Your contributions to open source, large or small, make projects like this possible. Thank you for taking the time to contribute.`
  },
  'SUPPORT.md': {
    filename: 'SUPPORT.md',
    description: 'Support information',
    content: `# Support

This document explains where and how to get help with this project.

## Asking Questions

Please don't use the issue tracker for support questions. Instead, use one of the following resources:

### GitHub Discussions
For questions, feature requests, and general discussions, please use [GitHub Discussions](https://github.com/username/repo/discussions) if available.

### Community Chat
If there's a community chat for the project, it will be linked here.

### Stack Overflow
You can ask questions on [Stack Overflow](https://stackoverflow.com/) using the tag \`your-project-tag\`.

## Reporting Bugs

If you've found a bug, please report it using the project's issue tracker. Be sure to include:

1. A clear description of the problem
2. Steps to reproduce the issue
3. Expected vs actual results
4. Your environment details (OS, browser, version, etc.)
5. Any relevant logs or screenshots

## Feature Requests

Feature requests are welcome. Please use the issue tracker or discussions to suggest new features.

## Security Issues

If you discover a security vulnerability, please DO NOT open an issue. Email [security@example.com] instead.

## Documentation

For documentation questions or improvements, please feel free to open an issue or submit a pull request.

## Commercial Support

If commercial support is available for the project, details will be provided here.`
  },
  'SECURITY.md': {
    filename: 'SECURITY.md',
    description: 'Security policy',
    content: `# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| 0.9.x   | :white_check_mark: |
| 0.8.x   | :x:                |
| < 0.8   | :x:                |

## Reporting a Vulnerability

We take the security of our project seriously. If you believe you've found a security vulnerability, please follow these steps:

1. **Do not disclose the vulnerability publicly**
2. **Email us at [security@example.com]** with details about the vulnerability
3. Include the following information:
   - Type of issue
   - Full paths of source file(s) related to the vulnerability
   - Location of the affected source code
   - Any special configuration required to reproduce the issue
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit it

## Response Process

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will provide an estimated timeline for a fix
- We will keep you updated as we work on a fix
- Once the vulnerability is fixed, we will publish a security advisory

## Security Updates

Security updates will be released as part of our regular release cycle or as emergency patches, depending on severity.

## Security-Related Configuration

Use this section to tell users about any security-related configuration options that your project supports.

## Known Security Gaps & Future Enhancements

Use this section to list any known security issues that users should be aware of, along with workarounds or plans for fixing them.

## Security Contacts

- Primary security contact: [security@example.com]
- Secondary security contact: [admin@example.com]`
  },
  '.gitignore': {
    filename: '.gitignore',
    description: 'Git ignore rules',
    content: `# Dependency directories
node_modules/
jspm_packages/

# Build outputs
dist/
build/
out/
.next/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Cache
.npm
.eslintcache
.cache

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor directories and files
.idea/
.vscode/
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Coverage directory
coverage/

# Optional REPL history
.node_repl_history

# Yarn Integrity file
.yarn-integrity`
  }
};

// Additional templates for JavaScript/TypeScript projects
export const javascriptTemplates: Record<string, FileTemplate> = {
  'package.json': {
    filename: 'package.json',
    description: 'NPM package configuration',
    content: `{
  "name": "project-name",
  "version": "1.0.0",
  "description": "A brief description of your project",
  "main": "index.js",
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1",
    "start": "node index.js"
  },
  "keywords": [],
  "author": "",
  "license": "MIT",
  "dependencies": {},
  "devDependencies": {}
}`
  },
  '.eslintrc.json': {
    filename: '.eslintrc.json',
    description: 'ESLint configuration',
    content: `{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "always"]
  }
}`
  },
  'tsconfig.json': {
    filename: 'tsconfig.json',
    description: 'TypeScript configuration',
    content: `{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020", "dom"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.spec.ts"]
}`
  }
};

// Additional templates for Python projects
export const pythonTemplates: Record<string, FileTemplate> = {
  'requirements.txt': {
    filename: 'requirements.txt',
    description: 'Python dependencies',
    content: `# Core requirements
pytest>=7.0.0
black>=22.1.0
isort>=5.10.1
flake8>=4.0.1`
  },
  'setup.py': {
    filename: 'setup.py',
    description: 'Package installation script',
    content: `from setuptools import setup, find_packages

setup(
    name="your-package-name",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        # Dependencies
    ],
    author="Your Name",
    author_email="your.email@example.com",
    description="A brief description of your package",
    keywords="example, package",
    url="https://github.com/username/repo",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
    ],
    python_requires=">=3.8",
)
`
  }
};

// Combine templates by category
export const getTemplatesByType = (type: string): Record<string, FileTemplate> => {
  const baseTemplates = {...fileTemplates};
  
  if (type === 'javascript') {
    return {...baseTemplates, ...javascriptTemplates};
  } else if (type === 'python') {
    return {...baseTemplates, ...pythonTemplates};
  }
  
  return baseTemplates;
};