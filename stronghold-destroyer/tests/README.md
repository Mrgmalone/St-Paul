# Stronghold Destroyer tests

Browser tests that play the game automatically in Chromium (through Playwright) and check that things still work.
Each prints what it measured and ends with `errors [...]`; a test passes when it exits cleanly with `errors []`.

Run them from the `stronghold-destroyer` folder:

    node tests/run-all.js              # everything (the 3D ones take several minutes each)
    node tests/run-all.js tK tFix      # only some

Screenshots and logs go to `tests/.work/` (not kept in git). The first run fetches three.js r128 from npm into that folder.

| Test | Checks |
|---|---|
| t7, t11, t14, tB, tC, tD, tE, tE3, tEc, tEn, tG, tL, tM, tMp, tP2, tQ, tS2, tSg, tT, tW, tWx | earlier features: economy, building, walls, raids, siege, enemy camp, weather, panels, touch |
| tK | knights, macemen, King, blacksmith, towers, mounted engines, armor rules, speech, mood |
| tGift, tInside2, tMk2, tTurn, tFix, tX | tower knights, people inside buildings, market prices, turning and tearing down, the Fix button, close buttons |
| t3d2, t3d6, t3d7, tTg2 | the 3D view (slow) |
| tArt2d, tArt3d | the unit art from design/sheet4: right view for the direction of travel, army and enemy colours, icons |
| soak.js | a long automatic game that watches for stuck units and errors: `node tests/soak.js legion 20` (not run by run-all) |
