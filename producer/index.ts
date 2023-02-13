import { DaprClient } from "@dapr/dapr";

// Common settings
const daprHost = "http://localhost";
const daprPort = "3500";

async function main() {
    console.log("Starting...");
    const bindingName = "cloudflare-queues";
    const bindingOperation = "publish";
    const client = new DaprClient(daprHost, daprPort);
    for(var i = 1; i <= 10; i++) {
        const message =  { data: "Hello World" + i };
        const response = await client.binding.send(bindingName, bindingOperation, message);
        if (response)
        {
            console.log(response);
        }
        await sleep(1000);
    }

    console.log("Completed.");
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

main().catch((e) => {
    console.error(e);
    process.exit(1);
})