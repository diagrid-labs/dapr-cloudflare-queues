import { DaprClient } from "@dapr/dapr";

// Common settings
const daprHost = "127.0.0.1";
const daprPort = "3500";

async function publish() {
    const bindingName = "cloudflare-queues";
    const bindingOperation = "publish";
    const message =  { "data": "Hello World" };

    const client = new DaprClient(daprHost, daprPort);
    const response = await client.binding.send(bindingName, bindingOperation, message);

    if (response)
    {
        console.log(response);
    }
    console.log("Completed.");
}

async function start() {
    console.log("Starting...");
    await publish();
}

start().catch((e) => {
    console.error(e);
    process.exit(1);
})