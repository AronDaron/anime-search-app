const idMal = 40748 // Jujutsu Kaisen
fetch(`https://api.jikan.moe/v4/anime/${idMal}/episodes`)
  .then((res) => res.json())
  .then((data) => {
    console.log('Episodes available:', data.data ? data.data.length : 0)
    if (data.data && data.data.length > 0) {
      console.log('First episode:', data.data[0])
    } else {
      console.log('Full response:', data)
    }
  })
