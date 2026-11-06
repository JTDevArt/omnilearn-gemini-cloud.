export class BoundedWorkQueue {
  constructor({ concurrency = 1, maxQueued = 4 } = {}) {
    this.concurrency = concurrency;
    this.maxQueued = maxQueued;
    this.active = 0;
    this.items = [];
  }
  get size() {
    return this.active + this.items.length;
  }
  run(work) {
    return new Promise((resolve, reject) => {
      if (
        this.active >= this.concurrency &&
        this.items.length >= this.maxQueued
      ) {
        reject(
          Object.assign(
            new Error(
              'Antrean pemrosesan file penuh. Coba lagi setelah beberapa dokumen selesai.'
            ),
            { status: 429, code: 'FILE_QUEUE_FULL', stage: 'file-queue' }
          )
        );
        return;
      }
      const start = () => {
        this.active++;
        Promise.resolve()
          .then(work)
          .then(resolve, reject)
          .finally(() => {
            this.active--;
            this.items.shift()?.();
          });
      };
      if (this.active < this.concurrency) start();
      else this.items.push(start);
    });
  }
}
