# Built-in packs

The app ships with **one** pack: `blank`, an empty map. PersoAtlas deliberately contains no curriculum; people build their own maps or import packs that others share as files.

To write a pack, start from [`docs/pack-template`](../docs/pack-template) and read [`docs/writing-a-pack.md`](../docs/writing-a-pack.md). Keep your packs outside this repository and build them with:

```bash
node scripts/build-packs.mjs --dir ~/my-packs
```
