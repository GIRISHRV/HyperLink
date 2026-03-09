# HyperLink Documentation Index

Welcome to the HyperLink documentation. This index provides quick access to all documentation resources.

## 📚 Documentation Categories

### 🤖 AI Assistant Context Files
Quick reference files optimized for AI assistants to understand the codebase.

- **[Claude Context](./claude.md)** - Comprehensive context for Claude AI assistant
- **[Gemini Context](./gemini.md)** - Comprehensive context for Gemini AI assistant

### 📋 Requirements & Specifications
Formal documentation of system requirements and specifications.

- **[Software Requirements Specification (SRS)](./SRS.md)** - Complete requirements document
  - Functional requirements
  - Non-functional requirements
  - Use cases
  - System constraints
  - Traceability matrix

### 🏗️ Architecture Documentation
System architecture, design, and technical documentation.

- **[System Architecture Overview](./architecture/SYSTEM_OVERVIEW.md)** - High-level system architecture
  - Component diagrams
  - Data flow diagrams
  - Technology stack
  - Deployment architecture
  - Security architecture

### 🎨 Design Language
UI patterns, code conventions, and architectural patterns.

- **[Design Language Overview](./design-language/README.md)** - Introduction to design language
- **UI Patterns** (Coming soon) - Component design patterns
- **Code Conventions** (Coming soon) - Naming and style guidelines
- **Architecture Patterns** (Coming soon) - System design patterns
- **Testing Patterns** (Coming soon) - Testing strategies

### 📖 User Guides
Documentation for understanding and using the system.

- **[Main README](./README-main.md)** - Project overview and quick start
- **[Explainer](./EXPLAINER.md)** - Non-technical explanation of how HyperLink works
- **[App Analysis](./APP_ANALYSIS.md)** - Technical deep-dive and known issues

### 🔧 Technical Guides
Detailed technical documentation for specific components.

- **[Signaling Server](./README-signaling.md)** - PeerServer setup and configuration
- **[Supabase Setup](./README-supabase.md)** - Database and authentication setup
- **[Testing Guide](./TESTING.md)** - Testing strategies and best practices
- **[Versioning](./VERSIONING.md)** - Version management guidelines

## 🚀 Quick Start Guides

### For Developers

**New to the project?**
1. Read [Main README](./README-main.md) for project overview
2. Review [System Architecture](./architecture/SYSTEM_OVERVIEW.md) for technical understanding
3. Check [Claude Context](./claude.md) or [Gemini Context](./gemini.md) for quick reference
4. Follow [Testing Guide](./TESTING.md) to run tests

**Adding a feature?**
1. Review [SRS](./SRS.md) to understand requirements
2. Check [Design Language](./design-language/README.md) for patterns
3. Refer to [AI Context Files](./claude.md) for code examples
4. Follow [Testing Patterns](./TESTING.md) for test coverage

### For AI Assistants

**Recommended reading order**:
1. **[Claude Context](./claude.md)** or **[Gemini Context](./gemini.md)** - Start here for quick understanding
2. **[System Architecture](./architecture/SYSTEM_OVERVIEW.md)** - For deeper technical context
3. **[SRS](./SRS.md)** - For requirements and use cases
4. **[Design Language](./design-language/README.md)** - For coding patterns

### For Stakeholders

**Non-technical overview**:
1. **[Explainer](./EXPLAINER.md)** - Understand what HyperLink does
2. **[SRS](./SRS.md)** - Review requirements and use cases
3. **[App Analysis](./APP_ANALYSIS.md)** - Understand technical challenges

**Technical overview**:
1. **[Main README](./README-main.md)** - Project overview
2. **[System Architecture](./architecture/SYSTEM_OVERVIEW.md)** - Technical architecture
3. **[SRS](./SRS.md)** - Complete requirements

## 📊 Documentation Status

| Document | Status | Last Updated | Completeness |
|----------|--------|--------------|--------------|
| Claude Context | ✅ Complete | 2024 | 100% |
| Gemini Context | ✅ Complete | 2024 | 100% |
| SRS | ✅ Complete | 2024 | 100% |
| System Architecture | ✅ Complete | 2024 | 100% |
| Design Language | 🚧 In Progress | 2024 | 30% |
| Main README | ✅ Complete | 2024 | 100% |
| Explainer | ✅ Complete | 2024 | 100% |
| App Analysis | ✅ Complete | 2024 | 100% |
| Testing Guide | ✅ Complete | 2024 | 100% |

## 🔍 Finding Information

### By Topic

**Authentication**:
- [SRS - Authentication Requirements](./SRS.md#31-user-authentication)
- [System Architecture - Authentication Flow](./architecture/SYSTEM_OVERVIEW.md#authentication-flow)
- [Claude Context - Supabase Integration](./claude.md#4-supabase-integration)

**File Transfer**:
- [SRS - File Transfer Requirements](./SRS.md#33-file-transfer)
- [System Architecture - Data Flow](./architecture/SYSTEM_OVERVIEW.md#data-flow)
- [Claude Context - Zero-Memory Transfer](./claude.md#1-zero-memory-file-transfer)
- [Explainer - How It Works](./EXPLAINER.md#-the-solution-how-it-works)

**WebRTC & P2P**:
- [SRS - Peer Connection Requirements](./SRS.md#32-peer-connection)
- [System Architecture - WebRTC Components](./architecture/SYSTEM_OVERVIEW.md#2-signaling-server-peerserver)
- [Claude Context - WebRTC Connection Management](./claude.md#2-webrtc-connection-management)
- [Signaling Server Guide](./README-signaling.md)

**Testing**:
- [Testing Guide](./TESTING.md)
- [SRS - Test Cases](./SRS.md#9-traceability-matrix)
- [Claude Context - Testing Patterns](./claude.md#testing-patterns)

**Deployment**:
- [System Architecture - Deployment](./architecture/SYSTEM_OVERVIEW.md#deployment-architecture)
- [Main README - Quick Start](./README-main.md#-quick-start)

### By Role

**Frontend Developer**:
- [Claude Context](./claude.md) - Quick reference
- [System Architecture](./architecture/SYSTEM_OVERVIEW.md) - Component structure
- [Design Language](./design-language/README.md) - UI patterns

**Backend Developer**:
- [Signaling Server Guide](./README-signaling.md)
- [Supabase Setup](./README-supabase.md)
- [System Architecture](./architecture/SYSTEM_OVERVIEW.md)

**QA Engineer**:
- [Testing Guide](./TESTING.md)
- [SRS - Use Cases](./SRS.md#5-use-cases)
- [SRS - Acceptance Criteria](./SRS.md#8-acceptance-criteria-summary)

**DevOps Engineer**:
- [System Architecture - Deployment](./architecture/SYSTEM_OVERVIEW.md#deployment-architecture)
- [Main README - Environment Setup](./README-main.md#environment-setup)

**Product Manager**:
- [SRS](./SRS.md) - Complete requirements
- [Explainer](./EXPLAINER.md) - Non-technical overview
- [App Analysis](./APP_ANALYSIS.md) - Known issues and roadmap

## 🤝 Contributing to Documentation

### Adding New Documentation

1. Create document in appropriate directory
2. Follow existing document structure
3. Add entry to this index
4. Update status table
5. Submit PR with documentation changes

### Updating Existing Documentation

1. Make changes to document
2. Update "Last Updated" date
3. Update version if significant changes
4. Update related documents if needed
5. Submit PR with clear description

### Documentation Standards

- Use Markdown format
- Include table of contents for long documents
- Use Mermaid for diagrams
- Provide code examples where applicable
- Keep language clear and concise
- Update index when adding new documents

## 📞 Support

**Questions about documentation?**
- Open an issue on GitHub
- Contact the maintainers
- Check existing documentation first

**Found an error?**
- Open an issue with details
- Submit a PR with fix
- Tag as "documentation"

---

**Documentation Version**: 1.0.0  
**Last Updated**: 2024  
**Maintainer**: HyperLink Team  
**License**: MIT
