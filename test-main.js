const { app } = require('electron')

app.whenReady().then(async () => {
    try {
        const url = 'https://store.steampowered.com/api/featuredcategories?l=polish&cc=PL'
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
          }
        })
        console.log("Status:", response.status)
        const data = await response.json()
        console.log("Keys:", Object.keys(data))
    } catch (e) {
        console.error("Error:", e)
    }
    app.quit()
})
