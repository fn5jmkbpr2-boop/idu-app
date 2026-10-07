# Nieoficjalna nakładka na dziennik IDU

> **Nieoficjalna nakładka, niezwiązana z IDU ani ze szkołą.** To prywatny projekt ucznia. Pokazuje tylko to, co i tak widzisz po zalogowaniu na s27.idu.edu.pl – w wygodniejszej formie.

## Co robi
- Nowy wygląd IDU na telefonie i na komputerze: Start, plan lekcji (dzień / oś czasu / tydzień), oceny, frekwencja, wiadomości, przedmioty.
- Ważne (gwiazdki i przypomnienia), notatki ze zdjęciami do lekcji, wyszukiwarka po wszystkim.
- Konto rodzica: oceny i frekwencja dziecka, prośby o usprawiedliwienie.
- Wiele stylów (iOS, OLED, Mono, Szkło, Zeszyt, Kolor…) i dużo ustawień.

## Prywatność
- Logujesz się zawsze na oficjalnej stronie IDU. Apka nie zna i nie zapisuje Twojego hasła.
- Żadnych własnych serwerów: wszystko dzieje się na Twoim urządzeniu, dane zostają w telefonie / przeglądarce.
- Jedyne połączenie poza IDU: pobranie nowej wersji wyglądu z tego repozytorium (GitHub).

## Instalacja
**Komputer i Android (przeglądarka):** zainstaluj Tampermonkey (Chrome, Edge, Firefox; na Androidzie Firefox), potem otwórz
[idu-skin.user.js](https://raw.githubusercontent.com/fn5jmkbpr2-boop/idu-app/main/IDU-App/Resources/idu-skin.user.js) i kliknij „Zainstaluj”. Aktualizuje się sam.

**iPhone (aplikacja):** GitHub → Actions → „Build IDU app” → artefakt **IDU-app** (`IDU.ipa`) → Sideloadly → Twoje Apple ID.
Wygląd aktualizuje się sam z tego repo; nowy build potrzebny tylko przy zmianach w samej aplikacji.

## Pliki
- `IDU-App/Resources/skin.js` – cały wygląd (wersja w nagłówku `@version`), ten sam plik co `idu-skin.user.js`
- `IDU-App/Sources/App.swift` – aplikacja iOS (WebView, wibracje, przypomnienia, pliki)
- `IDU-App/Widget/IDUWidget.swift` – widget „Następna lekcja”
- `.github/workflows/main.yml` – budowanie aplikacji
