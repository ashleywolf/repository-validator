# GitHub Repo Wizard

A tool to validate GitHub repositories for open source compliance, ensuring they include all required files and follow best practices.

## Features

- **Repository Structure Validation**: Checks for required and recommended files
- **GitHub OAuth Authentication**: Access private repositories and increase API rate limits
- **License Analysis**: Extracts license information and checks for GitHub copyright notices
- **Dependency Analysis**: Counts dependencies and identifies copyleft licenses requiring review
- **Repository Description Rating**: Evaluates the quality of repository descriptions
- **Template Creation**: Provides templates for missing required files

## Authentication

The application uses GitHub OAuth to:

1. Validate private repositories
2. Increase GitHub API rate limits
3. Access organization-level information

## Required Files Checked

- README.md - Project documentation
- LICENSE - License information
- CONTRIBUTING.md - Contribution guidelines
- SUPPORT.md - Support information
- SECURITY.md - Security policy
- CODE_OF_CONDUCT.md - Code of conduct (recommended)

## Additional Checks

- Package dependency analysis
- Copyleft license detection
- GitHub copyright notice verification
- Repository description quality

## Technologies

- React
- TypeScript
- Tailwind CSS
- Shadcn UI Components
- GitHub API
- Octokit

## Usage

1. Enter a GitHub repository URL
2. Sign in with GitHub (optional, for private repositories)
3. View validation results
4. Create missing files from templates as needed