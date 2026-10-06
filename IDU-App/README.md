# IDU – personal app

Opens the official IDU (s27.idu.edu.pl) directly from the phone, full screen, with the mobile skin.
No other servers are involved – it works like Safari, just without the browser bars.

## Build
GitHub → Actions → "Build IDU app" → Run workflow → download the **IDU-app** artifact (contains `IDU.ipa`).

## Install
Sideloadly (Windows) → connect iPhone → drop `IDU.ipa` → enter Apple ID → Start.

## Update the skin
Replace `Resources/skin.js`, commit, download the new build, install again with Sideloadly.
