# Landing illustrations

Drop the files here; the landing picks them up on the next page load. A missing
file is not an error — the block renders without artwork rather than showing a
broken-image icon.

| File                    | Where                                  |
| ----------------------- | -------------------------------------- |
| `hero-road.webp`        | Landing hero, dark theme               |
| `hero-road-light.webp`  | Landing hero, light theme              |
| `auth-bridge.webp`      | The panel beside the sign-in form      |

**Size:** 1280 px wide, WebP. The blocks are well under that on a desktop, so
it covers a retina screen twice over. Bigger is not better here: the generated
originals were 2688 px and several megabytes each, which on a phone plan is the
whole page spent before a word is read.

**Crop:** the image is drawn with `object-cover`, so keep the subject centred
and leave a little air at the edges.

## Removed: the three "why this is different" panels

`understand-position.webp`, `verified-profile.webp` and `bridge-the-gap.webp`
are gone. They were pattern work beside three arguments, and three of them down
the page turned a claim into a brochure. That section is now three ruled
columns carrying the argument itself. If artwork ever returns there, it should
say something the sentence beside it does not.
