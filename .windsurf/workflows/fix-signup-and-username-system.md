---
description: Fix Signup Flow with Required Username
---
CREATE WORKFLOW: "Fix Signup Flow with Required Username"

I want to save this as a workflow that fixes the authentication flow to require usernames during signup, ensures profiles are properly created, handles username uniqueness, and updates all social features to display usernames correctly.

═══════════════════════════════════════════════════════════════

WORKFLOW NAME: Fix Signup & Username System

DESCRIPTION:
Fixes the signup flow to capture username during registration, ensures username uniqueness, creates complete profiles with username, and updates all social features (sharing, feed, competitions, etc.) to properly display usernames instead of emails or IDs.

═══════════════════════════════════════════════════════════════

[The rest of the workflow is exactly as provided by the user, covering tasks 1–18: auditing the current signup flow, tightening the profiles schema with username constraints, adding username validation + availability checking, updating the signup page and auth hook to require username on registration, adding a backup profile trigger, wiring username into profile/public profile pages, updating all social features to show @username, adding a /profile/:username route, adjusting sharing links, optional migration for existing users, and thorough end-to-end testing to ensure usernames are consistently enforced and displayed across the app.]
