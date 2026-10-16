# Dibbler Escape

## Main Game Loop
* You (a tourist) spawn at a random street tile on the map edge in a procedurally generated maze of streets.
* A number of dibblers (street merchants) spawn: 2 + level, capped at 12.
* Your goal is to make it back to the safety of your hotel, on a random map edge far from your start, with some of your 3 cash left in your wallet.
** Every third level there is also a guide bus you can escape on.
* If a dibbler catches you, you throw money at them, and they go away.
* If you run out of cash, you are game over. The high score is saved in the browser.

### Controls
* Move: arrows/WASD (touch: joystick). Sprint: Shift. Kick friend: Ctrl. Pause: P/Esc. Mute: M.
* Sprinting drains stamina; when it runs out you must recover before sprinting again.

### Dibblers
* Dibblers have a view cone and can't see through walls; they notice you at close range regardless of facing.
* Spotting you makes a dibbler shout, which alerts other dibblers within range.
* Chasers that lose you go to your last known position, then call a "group chat" that rallies everyone to that spot, and finally give up and roam again.
* There is a short grace period at level start before they can see you.

### Traps and Features
* There are cats roaming the streets, if you come across one, you must stop to pet the cat (about 2 seconds). Each cat tips +1 cash once (up to the starting 3).
* A friend follows you around. Dibblers that walk close to the friend get distracted ("Oh, hello there!") for a few seconds, then have a cooldown.
* You can kick your friend: they fall over for a while, and the yelp creates an expanding noise ring that dibblers nearby hear and investigate (they head to where the friend fell).
* Movement collisions slide around corners: pushing into a wall edge next to a gap nudges you toward the nearest gap.
* Day and night themes follow the system light/dark preference.

## Engine Choices
* The game engine is a html5 web page, and is run by a javascript engine
* Plain canvas and ES modules, no build step; sound effects are synthesized with Web Audio.

## Art Style
* Game Name is "Dibbler Escape"
* Cartoony style. You a white tall male, wearing cargo shorts and a hawaii shirt and a tropic hat.
* Dibblers are wearing long flowy clothes
