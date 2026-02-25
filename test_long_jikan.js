const idMal = 6702 // Fairy Tail
async function test() {
  let res = await fetch(`https://api.jikan.moe/v4/anime/${idMal}/episodes?page=1`)
  let json = await res.json()
  console.log('Pagination info:', json.pagination)
  console.log('Total episodes returned on page 1:', json.data.length)
}
test()
