# 🌴 Dibbler Escape

A cartoony browser game about a tourist in a Hawaiian shirt trying to make it back to the hotel through a maze of streets, while a crowd of pushy street merchants (the *dibblers*) hunts them down.

No build step, no dependencies: plain HTML5 canvas and ES modules.

## How to play

- You spawn on a random edge of a procedurally generated town. Reach the **hotel** (also on an edge, far from your start) with cash still in your wallet.
- Every third level there is also a **guide bus** you can escape on.
- You start with **3 cash**. When a dibbler catches you, you throw money at them and they go away. Run out of cash and it's game over.
- Each level adds more dibblers; your best score is saved in the browser.

### Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | Arrow keys / WASD | On-screen joystick |
| Sprint | Shift | Sprint button |
| Kick your friend | Ctrl | Kick button |
| Pause | P / Esc | – |
| Mute | M | – |

Sprinting drains stamina; once exhausted you must recover before sprinting again.

### Things to know

- **Dibblers** have a view cone and can't see through walls. When one spots you it shouts, alerting nearby dibblers. If they lose you they check your last known position, then "group chat" to rally everyone there.
- **Lucky cats** roam the streets. Stop and pet one (it takes a couple of seconds) for a tip: +1 cash.
- **Your friend** follows you and distracts dibblers who walk past ("Oh, hello there!"). You can kick them over, but the yelp makes a noise ring that nearby dibblers hear and investigate.
- The game follows your system's light/dark preference for day and night themes.

## Run locally

ES modules need an HTTP server (opening `index.html` directly won't work):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works.

## Project layout

```
index.html      canvas + entry point
js/main.js      game loop, input, dibbler/friend/cat logic, rendering
js/maze.js      procedural maze generation and pathfinding
js/art.js       sprite drawing (tourist, dibblers, cats, hotel, bus)
js/scenery.js   themes, ground/buildings, title-screen scene
js/audio.js     synthesized sound effects
tests/          maze tests
GamePlan.md     original design notes
```

## Tests

```sh
node tests/maze.test.mjs
```
