# Evently — visual and interaction reference

## Landscape and type

The public landing follows the user-supplied recording, `Screen Recording 2026-11-09 at 11.50.51 PM.mov`. The locally served meadow is recorded footage, not a reconstructed 3D field. Its crop, flower density, camera and lighting remain the visual reference.

The original footage treatment trims the first 4.15 seconds to exclude recording controls, removes the recorded pointer at x=1140, y=712, width=50, height=58, and crops x=20, y=604, width=2212, height=796. The processed landscape is 1920 pixels wide at 24 fps; forward/reverse playback avoids a hard cut. The first processed frame supplies the poster. The source recording was provided by the user for this project.

The landing uses a compact wordmark/navigation, one serif headline, a short description, a login action and the landscape. It ends at the meadow; there is no lower explanation section, footer or playback button. The application runs on port 3000.

Cormorant Garamond supplies Vietnamese display headings, Instrument Serif the Latin wordmark and Inter interface text. Font files and their OFL licenses are served locally. Member screens use warm paper, sage, olive ink, generous spacing and the same typography. The main introduction remains intact.

## Authentication card

Login and registration are compact ivory dialogs with no logo tile or brand-name heading. The visible text is reduced to a centered serif title, persistent field labels, the primary action and an account-switch link. A join-specific note appears when authentication was requested from an event; general instructions remain available to assistive technology without extra visible copy.

The decorative top band uses peach light, layered sage terrain and larger cream, lilac, gold and pink voxel flowers. Shaded cuboid petals, stems and leaves keep the artwork consistent with the field. Flowers sway independently and a single butterfly floats and beats its wings. All artwork is pointer-transparent and hidden from assistive technology. Transform-based animation pauses while interacting with the form and becomes static with reduced motion.

White fields have olive focus rings. The primary action has a stronger forest-green fill, a round arrow and hover feedback. Email/password autocomplete and paste remain enabled; passwords can be revealed. Login/registration retain inline errors, preserved non-password field values and disabled pending actions.

The existing page remains mounted behind a blurred scrim. Opening the dialog makes background controls inert and pauses the landscape. Initial focus goes to the heading to keep saved-password suggestions from covering the dialog immediately. Tab is contained within the modal; Escape, the scrim and close button dismiss it and return focus. Short screens scroll inside the dialog. Closing resumes landscape playback subject to motion/data-saving preferences.

## Event discovery — default layout

The event list defaults to a **vertical timeline grouped by local calendar day** for both guests and members. The initial period is **Upcoming / Sắp tới**. It does not open in a card grid or require the user to choose the timeline first. The nearest upcoming event appears first; past events appear newest first.

Each compact event row separates time, title, host, location, participation state, attendance count and cover artwork. Upcoming/past tabs, accent-insensitive search, member participation/host/invitation filters and public/private selection operate on real API data. Loading, error, empty and filtered-empty states are explicit. No demonstration events are persisted.

Layout research: https://luma.com/discover and https://luma.com/ho-chi-minh-city. Evently uses its own branding, component code and cover artwork. No Luma event data, images or component source were copied.

Anyone can open `/#events`, browse public events and read their details without a session. The `public-events` API returns an explicit allowlist of display fields, a host display name and attendee count. It excludes private events, participant identities and account records. All member/mutation actions still require authentication.

Selecting Join opens authentication and remembers the event. Successful login or registration reopens that event's details; it does not automatically submit a join request. Cancelling clears the intent. Creating events also requires an account. Logout clears member-specific state before reloading public discovery. Hash routing supports direct links, reload and back navigation.

## Member workspace

Desktop navigation is horizontal; phones use labelled bottom navigation. Overview presents upcoming plans and activity. Friends uses connection rows, search, pending states and confirmation before removing a connection. Inbox separates event invitations, friend requests and join requests with explicit accept/decline actions. Shared forms and event editing preserve local date/time.

## Wildlife

Four warm-white rabbits are spread across distinct areas of the field, with scale decreasing at greater distance. They have independent phases and pace, short hops, grazing pauses and front/rear glances between sideways movement. Cuboid feet, ears, eyes and a tail make the views readable.

One Holstein dairy cow occupies a separate patch on the right. Its scale is 1.45 versus the largest rabbit's 1.0, approximately twice the rabbit's rendered length. A stepped barrel body, tapered forehead/cheeks, smaller pink muzzle, embedded charcoal-coloured body voxels, horns, hooves and udder distinguish it from the rabbits.

The cow has a 24-second cycle of walking, grazing/chewing, looking up, turning and walking back. Two-segment legs use computed knee positions and lifted swing arcs. Jaw, ears, tail and breathing articulate separately. These animations are verified by rendered Canvas pixels as well as the shared lifecycle tests.

Animals are software-rendered cuboid geometry in the video's native 1920×690 coordinates. The canvas and video share responsive fit/crop rules. One local grass patch tracks plate motion; fixed sunset lighting does not reverse when animals turn. Soft ground shadows, green reflected light, matched focus and live grass-derived masks integrate the silhouettes. This is a composite over supplied footage, not a complete depth map or a reconstructed 3D meadow.

All animals share one canvas and video-frame callback and render back to front. Hidden tabs, offscreen backgrounds, authentication dialogs, data-saving and reduced-motion preferences freeze both footage and animals. The poster supplies a static composition. Existing clocks resume after the dialog closes. Two small violet SVG butterflies remain decorative in the landscape.
