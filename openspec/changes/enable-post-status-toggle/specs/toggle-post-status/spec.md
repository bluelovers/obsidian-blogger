## ADDED Requirements

### Requirement: User can toggle post status between Draft and Live

The system SHALL allow users to toggle an existing Blogger post's status between Draft (`EnumPostStatus.Draft`) and Live (`EnumPostStatus.Live`) without re-publishing the full content. The toggle SHALL use a lightweight PATCH API call that only sends the `status` field.

#### Scenario: Toggle draft post to live
- **WHEN** user runs "Toggle Post Status" command on a note whose Front Matter `tags` contain `obsidian-blogger/draft`
- **THEN** system sends `PATCH /{blogId}/posts/{postId}?isDraft=false` with body `{"status": "LIVE"}`
- **THEN** system updates Front Matter: removes `obsidian-blogger/draft`, adds `obsidian-blogger/live` and `obsidian-blogger/published`
- **THEN** system shows Notice "Post status updated to LIVE"

#### Scenario: Toggle live post to draft
- **WHEN** user runs "Toggle Post Status" command on a note whose Front Matter `tags` contain `obsidian-blogger/live`
- **THEN** system sends `PATCH /{blogId}/posts/{postId}?isDraft=true` with body `{"status": "DRAFT"}`
- **THEN** system updates Front Matter: removes `obsidian-blogger/live` and `obsidian-blogger/published`, adds `obsidian-blogger/draft`
- **THEN** system shows Notice "Post status updated to DRAFT"

#### Scenario: Toggle fails when no postId in Front Matter
- **WHEN** user runs "Toggle Post Status" command on a note without `postId` in Front Matter
- **THEN** system shows error Notice "No post ID found in Front Matter"
- **THEN** system aborts the operation

#### Scenario: Toggle fails when API returns error
- **WHEN** API returns an error (e.g., 404, 401)
- **THEN** system shows error Notice with the error message
- **THEN** system does NOT modify Front Matter

### Requirement: User can publish a draft post to Live

The system SHALL provide a dedicated "Publish Draft" command that sets a draft post's status to Live. This is a convenience command equivalent to "Toggle" when the post is currently in Draft state.

#### Scenario: Publish draft to live
- **WHEN** user runs "Publish Draft" command on a note with `postId` in Front Matter
- **THEN** system sends `PATCH /{blogId}/posts/{postId}?isDraft=false` with body `{"status": "LIVE"}`
- **THEN** system updates Front Matter tags accordingly
- **THEN** system shows success Notice

#### Scenario: Publish draft fails when note has no postId
- **WHEN** user runs "Publish Draft" command on a note without `postId` in Front Matter
- **THEN** system shows error Notice "No post ID found in Front Matter"

### Requirement: User can revert a live post to Draft

The system SHALL provide a dedicated "Revert to Draft" command that sets a live post's status to Draft. This is a convenience command equivalent to "Toggle" when the post is currently in Live state.

#### Scenario: Revert live post to draft
- **WHEN** user runs "Revert to Draft" command on a note with `postId` in Front Matter
- **THEN** system sends `PATCH /{blogId}/posts/{postId}?isDraft=true` with body `{"status": "DRAFT"}`
- **THEN** system updates Front Matter tags accordingly
- **THEN** system shows success Notice

### Requirement: Updating existing post with publish() respects isDraft

When the existing `publishPost()` flow is used to update a post (i.e., `postId` exists), the system SHALL pass the correct `isDraft` query parameter in the API URL, so that the status change takes effect.

#### Scenario: Update existing draft post to live via publish modal
- **WHEN** user opens publish modal on a note with `postId` and sets status to Live, then clicks Publish
- **THEN** system sends `PUT /{blogId}/posts/{postId}?isDraft=false` with full post body including `status: "LIVE"`
- **THEN** API returns updated post with `status: "LIVE"`

#### Scenario: Update existing live post to draft via publish modal
- **WHEN** user opens publish modal on a note with `postId` and sets status to Draft, then clicks Publish
- **THEN** system sends `PUT /{blogId}/posts/{postId}?isDraft=true` with full post body including `status: "DRAFT"`
- **THEN** API returns updated post with `status: "DRAFT"`

### Requirement: RestClient provides httpPatch method

The `RestClient` class SHALL expose an `httpPatch()` method that sends HTTP PATCH requests, following the same pattern as existing `httpPost()` and `httpPut()` methods.

#### Scenario: httpPatch sends PATCH request
- **WHEN** `httpPatch()` is called with path and body
- **THEN** it sends an HTTP PATCH request to the constructed endpoint URL
- **THEN** it returns the parsed JSON response

### Requirement: Front Matter tags are updated after status change

After any successful API call that changes a post's status, the system SHALL update the note's Front Matter tags using `_updateFrontMatterTagsByPostStatus()`.

#### Scenario: Front Matter updated after toggle
- **WHEN** toggle operation succeeds
- **THEN** `_updateFrontMatterTagsByPostStatus()` is called with the new status
- **THEN** the resulting tags array is written back to the file's Front Matter

### Requirement: Publish modal status note is updated

The publish modal SHALL no longer display the note "NOTE: currently only available for new posts." next to the status dropdown, since status changes now work for both new and existing posts.

#### Scenario: Status dropdown note removed
- **WHEN** publish modal opens
- **THEN** the description for the status dropdown no longer contains "currently only available for new posts"
- **THEN** the description reflects that status applies to both new and existing posts
