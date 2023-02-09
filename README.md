# Event-driven architectures with Cloudflare queues and Dapr

This repository contains a sample application that demonstrates how to use [Cloudflare Queues](https://developers.cloudflare.com/queues/) and [Dapr](https://dapr.io/) to build an event-driven application.

The Dapr application (*producer*) in this repository will run locally and publish a message to a Cloudflare queue. A Cloudflare worker (*consumer*) will read the message from the queue and write it to the console.

## Prerequisites

The following is required to run this sample:

- Clone this repository to your local machine.
- Install [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
  - Use the Dapr CLI to install the Dapr runtime locally:

    `dapr init`

- Install [Node.js](https://nodejs.org/en/download/)
- Install [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Ensure you're on a Cloudflare paid plan, since that is required to use Cloudflare queues.
- Enable Queues in the Cloudflare dashboard.
  - Dashboard > Workers > Queues
  - Enable Queues Beta

## Creating the applications

The architecture will consists of three parts:

1. A Cloudflare queue
2. A *consumer* Cloudflare worker that reads messages from the queue.
3. A *producer* Dapr app that will publish messages to the queue.

## 1. Create a CloudFlare queue

1. Open a terminal and use the wrangler CLI to login to Cloudflare:

    `wrangler login`

    Follow the instruction in the browser to login to Cloudflare.

    The response in the terminal should end with:

    `Successfully logged in.`

2. Create the Cloudflare queue using the wrangler CLI:

   `wrangler queues create dapr-messages`

   The response in the terminal should end with:

    `Created queue dapr-messages.`

## 2. Create a consumer CloudFlare worker

You can either create a new *consumer* worker by following steps 1-3, or use the existing *consumer* worker in this repository and continue from step 4.

1. In the root folder, create a worker to consume messages:

    `wrangler init consumer`

   1. Create package.json: `Y`
   2. Use TypeScript: `Y`
   3. Create worker: `Fetch handler`
   4. Write tests: `N`

   A new folder named *consumer* will be created which contains the worker.

2. Update the *consumer/src/index.ts* file to:

```typescript
export default {
   async queue(
      batch: MessageBatch<Error>,
      env: Env
   ): Promise<void> {
      let messages = JSON.stringify(batch.messages);
      console.log(`${messages}`);
   },
};
```

3. Add the following lines to the *consumer/wrangler.toml* file:

```toml
[[queues.consumers]]
 queue = "dapr-messages"
 max_batch_size = 1
```

4. Ensure that you're in the *consumer* folder and install the dependencies:

   `cd consumer`

   `npm install`

5. Publish the *consumer* worker:

   `wrangler publish`

   The response in the terminal should end with:

  ```
  Published consumer (... sec)
    https://consumer.<SUBDOMAIN>.workers.dev
    Consumer for dapr-messages
  Current Deployment ID: <DEPLOYMENT_ID>
  ```

6. Start a tail to read the log of the consumer worker:

   `wrangler tail --format=json`

## 3. Configuring the producer Dapr app

The Cloudflare binding uses a Cloudflare worker to publish messages since only Cloudflare workers can access the queue.

There are two options for this worker:

1. Dapr provisions the worker.
2. You use a pre-provisioned Cloudflare worker.

This sample uses option 1. Read the [Cloudflare Queues binding spec](https://v1-10.docs.dapr.io/reference/components-reference/supported-bindings/cloudflare-queues/#configuring-the-worker) and choose *Manually provision the Worker script* if you want to go for option 2.

### Create a binding file

1. Rename the `producer/resources/binding.yaml.template` to `producer/resources/binding.yaml`.
2. Open the `binding.yaml` file and inspect its content.

    ```yaml
    apiVersion: dapr.io/v1alpha1
    kind: Component
    metadata:
      name: <NAME>
    spec:
      type: bindings.cloudflare.queues
      version: v1
      # Increase the initTimeout if Dapr is managing the Worker for you
      initTimeout: "120s"
      metadata:
        # Name of the existing Cloudflare Queue (required)
        - name: queueName
          value: "dapr-messages"
        # Name of the Worker (required)
        - name: workerName
          value: "dapr-message-worker"
        # PEM-encoded private Ed25519 key (required)
        - name: key
          value: |
            -----BEGIN PRIVATE KEY-----
            MC4CAQ...
            -----END PRIVATE KEY-----
        # Cloudflare account ID (required to have Dapr manage the Worker)
        - name: cfAccountID
          value: ""
        # API token for Cloudflare (required to have Dapr manage the Worker)
        - name: cfAPIToken
          value: ""
        # URL of the Worker (required if the Worker has been pre-created outside of Dapr)
        - name: workerUrl
          value: ""
    ```

    The `metadata.name`, `spec.metadata.queueName` and `spec.metadata.workerName` values have already been set. Ensure that the `queueName` matches the `queue` setting in the *consumer* worker `wrangler.toml` file.

    Values for `spec.metadata.key`, `spec.metadata.cfAccountID`, and `spec.metadata.cfAPIToken` still need to be provided.

3. Follow [these instructions](https://v1-10.docs.dapr.io/reference/components-reference/supported-bindings/cloudflare-queues/#generate-an-ed25519-key-pair) in the Dapr docs to set the value for `spec.metadata.key`.
4. The Cloudflare account ID should go in the `spec.metadata.cfAccountID` field. You can find the account ID in the Cloudflare dashboard URL: `https://dash.cloudflare.com/<ACCOUNT_ID>/workers/overview`.
5. A Cloudflare API token should go in the `spec.metadata.cfAPIToken` field. It can be generated as follows:
   1. In the Cloudflare dashboard, go to the Workers page.
   2. Click the *API tokens* link
   3. Click the *Create token* button
   4. Click the *Use template* button for Edit Cloudflare Workers
   5. Update the permissions to only contain:
      - *Account* | *Worker Scripts* | *Edit*
   6. Update the Account Resources to only contain:
      - *Include* | *\<YOUR ACCOUNT\>*
   7. Set a time to live (TTL) for the token, the shorter the better, if you're just testing.

Now the binding file is complete. The file is gitignored so the secrets won't be committed to the repository.

### Inspecting the Node app

Let's have a look at the Dapr app that will send the messages to the Cloudflare queue.

1. Inspect the `producer/index.ts` file.

    ```javascript
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
    }

    async function start() {
        await publish();
    }

    start().catch((e) => {
        console.error(e);
        process.exit(1);
    })
    ```

    Note that the `bindingName` is set to `cloudflare-queues` and matches the value in the `binding.yaml`. The `bindingOperation` is set to `publish` (`create` could be used as an alias).

## Run the producer app

1. Open a new terminal window and navigate to the `producer` folder.
2. Run the following command to start the producer app:

    ```bash
    dapr --app-id producer --app-protocol http --app-port 5001 --resources-path ./resources -- npm run start
    ```

### More information

Read about the Dapr [Cloudflare Queues bindings spec](https://v1-10.docs.dapr.io/reference/components-reference/supported-bindings/cloudflare-queues/) on the Dapr docs site.

Any questions or comments about this sample? Join the [Dapr discord](https://aka.ms/dapr-discord) and join the conversation with thousands of other Dapr developers.
