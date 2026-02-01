# Cleanup Old Releases Workflow

## Overview

This GitHub Actions workflow automatically manages repository releases by keeping only the most recent releases for each tool. It prevents the accumulation of old releases while maintaining a useful history.

## Purpose

The workflow:
- Fetches all releases from the repository
- Groups releases by tool name (e.g., "HTML Sample Tool", "PCF Builder", "Data Migrator")
- Identifies the top 3 most recent releases for each tool
- Optionally deletes older releases to maintain a clean release history

## How It Works

### Release Naming Convention

The workflow expects releases to follow this naming pattern:
```
[Tool Name] v[Version]
```

**Examples:**
- ✅ Positive matches (same tool):
  - "HTML Sample Tool v0.0.1"
  - "HTML Sample Tool v0.0.2"
  - "HTML Sample Tool v0.0.3"
  
- ✅ Negative matches (different tools):
  - "PCF Builder v0.0.1"
  - "Data Migrator v0.0.1"

### Grouping Logic

The workflow:
1. Extracts the tool name by removing the version suffix (e.g., " v0.0.1")
2. Groups all releases with the same tool name
3. Sorts releases by publication date (newest first)
4. Keeps the top 3 releases
5. Marks older releases for deletion

### Example Scenario

Given these releases:
- HTML Sample Tool v0.0.1 (2024-01-01)
- HTML Sample Tool v0.0.2 (2024-02-01)
- HTML Sample Tool v0.0.3 (2024-03-01)
- HTML Sample Tool v0.0.4 (2024-04-01)
- HTML Sample Tool v0.0.5 (2024-05-01)
- PCF Builder v0.0.1 (2024-01-15)
- PCF Builder v0.0.2 (2024-02-15)

The workflow will:
- **HTML Sample Tool**: Keep v0.0.5, v0.0.4, v0.0.3 → Delete v0.0.2, v0.0.1
- **PCF Builder**: Keep both (only 2 releases ≤ 3)

## Running the Workflow

### Automatic Execution

The workflow runs automatically:
- **Schedule**: Every Sunday at 00:00 UTC
- **Mode**: Dry-run (safe mode that only shows what would be deleted)

### Manual Execution

You can manually trigger the workflow:

1. Go to **Actions** tab in GitHub
2. Select **Cleanup Old Releases** workflow
3. Click **Run workflow**
4. Choose the mode:
   - `dry_run: true` (default) - Shows what would be deleted without actually deleting
   - `dry_run: false` - Actually deletes the old releases

### Dry-Run Mode (Safe Mode)

By default, the workflow runs in dry-run mode:
- ✅ Shows analysis of all releases
- ✅ Groups releases by tool
- ✅ Identifies what would be deleted
- ❌ Does NOT actually delete anything

**Output Example:**
```
📊 Analysis by Tool:
====================

Tool: HTML Sample Tool
  Total releases: 5
  ⚠️  Will delete 2 old releases (keeping newest 3)
  📌 Keeping:
     - HTML Sample Tool v0.0.5 (published: 2024-05-01)
     - HTML Sample Tool v0.0.4 (published: 2024-04-01)
     - HTML Sample Tool v0.0.3 (published: 2024-03-01)
  🗑️  Marking for deletion:
     - HTML Sample Tool v0.0.2 (published: 2024-02-01)
     - HTML Sample Tool v0.0.1 (published: 2024-01-01)

Summary
=======
Total releases: 11
Unique tools: 3
Releases to delete: 3
```

### Delete Mode

To actually delete releases:

1. **Important**: First run in dry-run mode to verify what will be deleted
2. Review the output carefully
3. Manually trigger the workflow with `dry_run: false`
4. The workflow will delete the old releases and their associated tags

## Workflow Configuration

### File Location
`.github/workflows/cleanup-releases.yml`

### Permissions Required
- `contents: write` - Required to delete releases and tags

### Environment Variables
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### Schedule
```yaml
schedule:
  - cron: '0 0 * * 0'  # Weekly on Sundays at 00:00 UTC
```

### Inputs (Manual Trigger)
- `dry_run`: Choice of 'true' (default) or 'false'

## Safety Features

1. **Dry-run by default**: The workflow won't delete anything unless explicitly set to delete mode
2. **Keeps top 3**: Always maintains the 3 most recent releases per tool
3. **Detailed logging**: Shows exactly what will be deleted before any action
4. **Manual approval**: Delete mode must be manually triggered
5. **Error handling**: Uses `set -e` to stop on errors

## Maintenance

### Adjusting the Number of Releases to Keep

To change from keeping 3 releases to a different number:

1. Edit the workflow file: `.github/workflows/cleanup-releases.yml`
2. Find the line: `keep_count=3`
3. Change the number to your desired value
4. Update the condition: `if [ "$release_count" -le 3 ]; then`

### Changing the Schedule

To run more or less frequently:

1. Edit the cron expression in the workflow file
2. Examples:
   - Daily: `0 0 * * *`
   - Monthly: `0 0 1 * *`
   - Bi-weekly (1st and 15th of month): Use two entries: `0 0 1,15 * *`

## Troubleshooting

### Release Not Recognized as Part of a Tool

**Problem**: Release doesn't match the naming pattern
**Solution**: Ensure releases follow the format: `[Tool Name] v[Version]`

### Wrong Releases Being Marked for Deletion

**Problem**: Release dates might be incorrect
**Solution**: The workflow sorts by `publishedAt` date. Check release dates are correct.

### Permission Denied Error

**Problem**: Workflow doesn't have permission to delete releases
**Solution**: Ensure the workflow has `contents: write` permission

## Testing

Before using in production:

1. Run in dry-run mode multiple times
2. Verify the analysis output is correct
3. Check that the correct releases are marked for deletion
4. Only then switch to delete mode

## Support

For issues or questions about this workflow, please open an issue in the repository.
