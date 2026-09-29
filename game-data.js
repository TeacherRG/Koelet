/* Load the shared interface data and one JSON bundle per story chapter. */
const worldFiles = [
  'city-of-success',
  'puzzle',
  'mirror',
  'brothers',
  'workshop',
  'heleq-lab',
  'one-piece'
];

window.GAME_DATA_READY = Promise.all(
  ['shared', 'prologue', ...worldFiles].map(async name => {
    const response = await fetch(`content/${name}.json`);
    if (!response.ok) throw new Error(`Could not load content/${name}.json`);
    return response.json();
  })
).then(([shared, prologue, ...worlds]) => {
  Object.assign(window, shared, {PROLOGUE: prologue, WORLDS: worlds});
});
