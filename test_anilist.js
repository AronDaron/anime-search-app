const fetch = require('node-fetch');
const query = `
query {
  Media(id: 113415, type: ANIME) {
    id
    idMal
    streamingEpisodes {
      title
      site
    }
  }
}
`;
fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
}).then(res => res.json()).then(console.log);
