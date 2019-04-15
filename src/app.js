let web3Provider, nodeProvider;

async function run() {
  await initWeb3();
  await initContract();
  await setupCF();
  await install();
}

async function initWeb3() {
  // Modern dapp browsers...
  if (window.ethereum) {
    web3Provider = window.ethereum;
    try {
      // Request account access
      await window.ethereum.enable();
    } catch (error) {
      // User denied account access...
      console.error("User denied account access")
    }
  }
  // Legacy dapp browsers...
  else if (window.web3) {
    web3Provider = window.web3.currentProvider;
  }
  // If no injected web3 instance is detected, fall back to Ganache
  else {
    web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
  }
  web3 = new Web3(web3Provider);
}

async function initContract() {
  let res = await fetch('App.json')
  let AppArtifact = await res.json();
  let App = TruffleContract(AppArtifact);
  
  // Set the provider for our contract
  App.setProvider(web3Provider);
}

async function setupCF() {
  nodeProvider = new cf.NodeProvider();
  await nodeProvider.connect();
}

async function install() {
  const contractAddress = '';
  const actionEncoding = '';
  const stateEncoding = '';
  
  let cfProvider = new cf.Provider(nodeProvider);
  let appFactory = new cf.AppFactory(contractAddress, {
    actionEncoding,
    stateEncoding
  }, cfProvider);

  proposeInstall(appFactory);

  cfProvider.on('installVirtual', onInstallEvent);
  cfProvider.on('updateState', onUpdateEvent);
}

async function proposeInstall(appFactory) {
  const { intermediary, nodeAddress } = await getOpponentData();
  const depositAmount = '';
  const initialState = {};

  await appFactory.proposeInstallVirtual({
    initialState,
    proposedToIdentifier: nodeAddress,
    asset: {
      assetType: 0 /* AssetType.ETH */
    },
    peerDeposit: parseEther(depositAmount),
    myDeposit: parseEther(depositAmount),
    timeout: 172800,
    intermediaries: [intermediary]
  });
}

async function onInstallEvent(event) {
  const appInstance = event.data.appInstance;
}

async function onUpdateEvent(event) {
  const newState = event.data.newState;
}


// THE NEED FOR THESE METHODS WILL BE REMOVED
async function getUserData() {
  return (await requestDataFromPG("playground:request:user", "playground:response:user")).data.user;
}

async function getOpponentData() {
  return (await requestDataFromPG("playground:request:matchmake", "playground:response:matchmake")).data.attributes;
}

async function requestDataFromPG(requestName, responseName) {
  return await new Promise(resolve => {
    const onPGResponse = (event) => {
      if (event.data.toString().startsWith(responseName)) {
        window.removeEventListener("message", onPGResponse);

        const [, data] = event.data.split("|");
        resolve(JSON.parse(data));
      } else if (
        event.data.data &&
        typeof event.data.data.message === "string" &&
        event.data.data.message.startsWith(responseName)
      ) {
        window.removeEventListener("message", onPGResponse);

        resolve({ data: event.data.data.data });
      }
    };

    window.addEventListener("message", onPGResponse);

    if (window === window.parent) {
      // dApp not running in iFrame
      window.postMessage(
        {
          type: "PLUGIN_MESSAGE",
          data: { message: requestName }
        },
        "*"
      );
    } else {
      window.parent.postMessage(requestName, "*");
    }
  })
}

window.onload = function() {
  run();
};