# Avvio rapido del dev server Expo.
# Aggiunge Node al PATH (solo per questa sessione) e lancia "expo start".
# Uso:  .\start.ps1            (avvio normale)
#       .\start.ps1 --tunnel   (se il QR su WiFi non funziona)
$env:Path = "C:\Program Files\nodejs;" + $env:Path
npx expo start @args
