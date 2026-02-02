# Flappy Bird Network Optimization

## Goal

Improve the responsiveness and smoothness of the Flappy Bird game by implementing Client-Side Prediction (CSP), Server Reconciliation, and Interpolation. Additionally, increase the server's network tick rate to 40Hz.

## Current Status

- [ ] Planning & Design
  - [x] Create Implementation Plan
- [ ] Server Updates
  - [ ] Increase Network Tick Rate to 40Hz in `FlappyBirdInstance.ts`
  - [ ] Verify `checkCollisions` handles faster updates correctly
- [ ] Client Updates
  - [ ] Import `FLAPPY_PHYSICS` in `FlappyBirdsScene.ts`
  - [ ] Implement Local Physics Loop in `update()` for `myPlayerId`
  - [ ] Implement `handleFlap` to update local velocity immediately (Prediction)
  - [ ] Implement Server Reconciliation for `myPlayerId` in `update()` or `storeSubscription`
    - [ ] Compare local position with server position from `FLAPPY_WORLD_STATE` (via store)
    - [ ] Correct local position if error is too large
  - [ ] Tune Interpolation for other players

## Implementation Plan

### Server: `packages/server/src/games/instances/FlappyBirdInstance.ts`

- **Change Network Tick Rate**: Increase `NETWORK_TICK_RATE` from 20 to 40.
- **Note**: The physics tick rate remains at 60Hz.

### Client: `packages/client/src/game/scene/flappybirds/FlappyBirdsScene.ts`

- **Import Physics Constants**: Import `FLAPPY_PHYSICS` from `common/config` to replicate physics locally.
- **Local Physics State**: Add `myPosition` and `myVelocity` properties to track the local prediction.
- **Client-Side Prediction (CSP)**:
  - In `handleFlap`, immediately apply jump velocity to `myVelocity`.
  - In `update`, apply gravity to only _my_ bird using `myVelocity` and `FLAPPY_PHYSICS`.
  - Update the visual sprite position based on this local calculation for _my_ bird.
- **Server Reconciliation**:
  - When receiving `FLAPPY_WORLD_STATE` (via `useGameStore` subscription):
    - For _my_ bird: Compare server (authoritative) position (`targetPositions[myIndex]`) with local `myPosition`.
    - If the discrepancy is significant (e.g., > 10 pixels), smoothly interpolate or snap the local position to the server position.
    - If the discrepancy is small, trust the local prediction to maintain smoothness.
- **Interpolation**:
  - For _other_ birds: Continue using the existing linear interpolation `Phaser.Math.Linear` logic but verify if the factor (0.3) needs adjustment for 40Hz updates.
