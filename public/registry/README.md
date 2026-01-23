# Power Platform Tool Box - Tool Registry

Official registry for Power Platform ToolBox extensions.

## For Users
Tools are automatically synced to the Power Platform ToolBox marketplace.

## For Developers
Submit your tool via [GitHub Issues](../../issues/new/choose).

## Registry URL
`https://powerplatformtoolbox.com/registry/registry.json`

## Registry Schema

Each tool entry in the registry contains the following fields:

- `id`: Unique identifier for the tool (kebab-case)
- `name`: Display name of the tool
- `description`: Brief description of the tool
- `author`: Tool author or organization
- `version`: Current version (semver)
- `downloadUrl`: URL to download the tool package (.tar.gz)
- `iconUrl`: (Optional) URL to the tool's icon image
- `readme`: URL to the tool's README documentation
- `checksum`: SHA-256 checksum of the package
- `size`: Package size in bytes
- `publishedAt`: ISO 8601 timestamp of publication
- `tags`: Array of category tags
