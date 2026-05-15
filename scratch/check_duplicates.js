async function checkDuplicates() {
  try {
    const res = await fetch('http://localhost:8080/api/items');
    if (!res.ok) {
      console.log('Status:', res.status);
      return;
    }
    const items = await res.json();
    const ids = items.map(i => i.id);
    const uniqueIds = new Set(ids);
    console.log(`Total items: ${items.length}`);
    console.log(`Unique IDs: ${uniqueIds.size}`);
    if (items.length !== uniqueIds.size) {
      console.log('DUPLICATES FOUND!');
      const counts = {};
      ids.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
      Object.keys(counts).forEach(id => {
        if (counts[id] > 1) {
          console.log(`ID ${id} appears ${counts[id]} times`);
        }
      });
    } else {
      console.log('No duplicates found in items.');
    }
  } catch (err) {
    console.error(err);
  }
}

checkDuplicates();
