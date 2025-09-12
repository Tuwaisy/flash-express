#!/bin/bash

# Update WhatsApp Access Token in Railway
TOKEN="EAAUne2VouXUBPTJ6jDyZAwezgYAe86OJUQLVKaZC3m8DHxgWVRYfU4uBkCxQq7VCQtzPLttJXSGy04j9ulrRhN7ngDHwHyc3ipc9EkdQHYfcHTFOJjaPpeFYyCcu1vmjpN9qLJwcf5rNuN1qCL5FPZBj6ey0naLHZARs2aXaQr6XjjDrWAIZAqssgFZC0JDkHz3QZDZD"

echo "Updating WhatsApp Access Token in Railway..."
echo "Token length: ${#TOKEN} characters"

railway variables --set "WHATSAPP_ACCESS_TOKEN=$TOKEN"

echo "Token update completed!"
