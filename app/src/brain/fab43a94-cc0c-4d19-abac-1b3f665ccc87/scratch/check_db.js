import { initDB } from './app/src/store/useDBStore.js';

async function checkPoems() {
  try {
    const db = await initDB();
    const result = db.exec("SELECT * FROM poemas");
    if (result[0]) {
      console.log(`Found ${result[0].values.length} poems.`);
    } else {
      console.log("No poems found in database.");
    }
  } catch (err) {
    console.error("Error checking poems:", err);
  }
}

checkPoems();
