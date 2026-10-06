# IDU – osobista aplikacja

Otwiera oficjalne IDU (s27.idu.edu.pl) na pełnym ekranie, z mobilnym wyglądem (skin.js).
Nie używa żadnych innych serwerów.

## Co jest w środku
- `Sources/App.swift` – aplikacja (WebView, wibracje, przypomnienia, otwieranie plików, szybki start)
- `Shared/IDUShared.swift` – plan lekcji wspólny dla aplikacji i widgetu
- `Widget/IDUWidget.swift` – widget „Następna lekcja” (ekran główny + ekran blokady)
- `Resources/skin.js` – cały wygląd (wersja w nagłówku `@version`)
- `project.yml` – projekt dla XcodeGen

## Budowanie
GitHub → Actions → „Build IDU app” → Run workflow → pobierz artefakt **IDU-app** (`IDU.ipa`).
Jeśli widget się nie zbuduje, aplikacja i tak powstanie (ostrzeżenie w logu „Build widget”).

## Instalacja
Sideloadly → podłącz iPhone’a → przeciągnij `IDU.ipa` → Apple ID → Start.
