
async function run() {
  const nodeProvider = new cf.NodeProvider();
  const cfProvider = new cf.Provider(nodeProvider);

  await nodeProvider.connect();
}

run();