# Achievements and local progress

CyberPaste presents personal progress as achievements first, with supporting usage summaries. The feature is designed to celebrate long-term use without collecting telemetry.

## Privacy

Achievements and progress are stored only in the local CyberPaste profile. CyberPaste does not send analytics, telemetry, clipboard contents, or usage data to CyberGems.

The feature does not change the existing local-first behavior. Clipboard content can leave the device only when the user chooses an AI provider or exports a backup.

## What is counted

Progress is recorded only after an accepted local action:

- New clips captured, counted once per unique clip saved.
- Clips pasted or copied from CyberPaste.
- Deliberate history searches, with rapid refreshes and pagination ignored.
- Folders created, clips pinned, and AI actions completed.
- Active calendar days and the current consecutive-day streak.
- Captured clip types.

Repeated clipboard notifications, ignored applications, rejected content, and duplicate captures do not inflate the clip milestone counter.

## Achievement progression

The clip milestones are intentionally long-term:

- First clip.
- 1,000 clips.
- 5,000 clips.
- 10,000 clips.
- 25,000 clips, the highest clip milestone.

Other achievements cover pastes, searches, organization, AI actions, supported clip types, and 7, 30, 100, and 365 active days.

## User controls

Local progress is enabled by default and can be disabled in Settings > Achievements & Progress.

- Disabling progress stops new counters and does not delete existing progress.
- Achievement notifications can be disabled separately.
- Resetting progress removes counters and unlocked achievements, but does not delete clips.
- The original profile date is preserved when progress is reset.

The original profile date means the first recorded use of the CyberPaste profile. For new profiles it is written on first startup. For existing profiles, CyberPaste uses the profile or database creation timestamp when Windows provides it. It is not presented as an exact installer timestamp when that cannot be verified.

## Backups

Manual and automatic CyberPaste backups include:

- The original profile date.
- Lifetime progress totals.
- Daily activity summaries.
- Unlocked achievements and their unlock dates.

Progress is stored separately from clipboard rows, so deleting clips, pruning the history, or changing the history limit does not erase achievements. The backup format uses a versioned progress snapshot. Older backups that predate this feature remain importable; when they do not contain progress, existing local progress is preserved rather than silently erased.
