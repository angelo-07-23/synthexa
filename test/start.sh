#!/bin/bash

# Installare le dipendenze

# Avviare con la scelta
echo "Avvia ecommerce.sh (React + Firebase) o endpoint.sh (Node.js semplice)?"
echo "1 - ecommerce.sh (Recomandato)"
echo "2 - endpoint.sh"
read -p "Scelta (1 o 2): " choice

if [ "$choice" == "1" ]; then
  bash ecommerce.sh
else
  bash endpoint.sh
fi
