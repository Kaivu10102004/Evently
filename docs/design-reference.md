# Evently landing page — reference treatment

The landing page follows the user supplied recording, `Screen Recording 2026-11-09 at 11.50.51 PM.mov`.

The field uses a locally served crop of that footage. It is recorded motion, not a live 3D scene. The previous procedural Three.js approximation was replaced because its camera, field density, lighting and flowers differed from the supplied visual.

- Trim the first 4.15 seconds to exclude the macOS recording controls at the end.
- Crop the landscape to x=20, y=604, width=2212, height=796.
- Remove the recorded pointer at x=1140, y=712, width=50, height=58 before cropping.
- Resize to 1920 pixels wide, 24 fps. Play forward and backward to avoid an abrupt looping cut.
- Use the first processed frame as the poster for reduced motion and failed autoplay.

The HTML controls, account screens and app remain implemented locally. No component source was copied from the reference website. The source recording is supplied by the user; its landscape asset is used for this project.

The header and hero follow the reference proportions: a compact header, a single serif headline, a two-line description, one black pill action, and a landscape that begins around 27% of the reference page width down the page. There are no added hero eyebrows, counters, captions or scroll labels.

Cormorant Garamond is used for the Vietnamese display heading because Instrument Serif lacks the required Vietnamese glyphs. Instrument Serif is used for the Latin wordmark. Inter is used for interface text. The fonts are served locally and their OFL licenses are included in `public/fonts`.

Playback respects reduced motion and data saving preferences. It pauses while the tab is hidden or the background is outside the viewport.

The visible playback button was removed at the user’s request. Reduced-motion and data-saving preferences still pause the background automatically.

## Member workspace

The workspace now uses the same wordmark, Cormorant display headings, Inter interface text, white space and black pill actions as the introduction. Desktop navigation is horizontal; phones use a labelled bottom navigation bar.

- Overview: typographic metrics, one meadow feature, the member’s upcoming schedule and activity.
- Events: editorial date artwork, title/location/organizer hierarchy and visible detail actions on mobile.
- Friends: simple connection rows, search, pending states and a confirmation before removing a connection.
- Inbox: explicit event/friend/join categories, count filters, accept and decline actions.
- Account: a split composition with a quiet meadow image and a clean form.
- Dialogs: shared form fields, inline errors, keyboard focus containment, Escape dismissal and focus return. The document handles events from the separately mounted dialog root. Editing preserves local date/time.

Visual checks use an isolated development instance on port 3100 and a temporary database; illustrative users and events are not part of the repository or the main application's data.
