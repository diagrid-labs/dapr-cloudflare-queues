# Event-driven architectures with Cloudflare queues and Dapr

This repository contains a sample application that demonstrates how to use [Cloudflare Queues](https://developers.cloudflare.com/queues/) and [Dapr](https://dapr.io/) to build an event-driven application.

The Dapr application (*producer*) in this repository will run locally and publish a message to a Cloudflare queue. A Cloudflare worker (*consumer*) will read the message from the queue and write it to the console.

## Prerequisites

The following is required to run this sample:

- Install [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- Use the Dapr CLI to install the Dapr runtime locally:

    `dapr init`

- Install [Node.js](https://nodejs.org/en/download/)
- Install [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Ensure you're on a Cloudflare paid plan, since that is required to use their queues.
- Enable Queues in the Cloudflare dashboard.
  - Dashboard > Workers > Queues
  - Enable Queues Beta

## Creating the applications

The architecture will consists of three parts:

1. A Cloudflare queue
2. A *producer* Dapr app that will publish messages to the queue.
3. A *consumer* Cloudflare worker that reads messages from the queue.

### Create a CloudFlare queue

1. Open a terminal and use the wrangler CLI to login to Cloudflare:

    `wrangler login`

2. Create the Cloudflare queue using the wrangler CLI:

   `wrangler queues create dapr-messages`

### Create a producer Dapr app

The Cloudflare binding uses a Cloudflare worker to publish messages since only Cloudflare workers can access the queue.

There are two options for this worker:

1. Dapr provisions the worker.
2. You use a pre-provisioned Cloudflare worker.

This sample uses option 1. Read the [Cloudflare Queues binding spec](https://v1-10.docs.dapr.io/reference/components-reference/supported-bindings/cloudflare-queues/#configuring-the-worker) if you want to go for option 2.

// TODO

<details>
    <summary>Creating Cloudflare API token</summary>

    - In the Cloudflare dashboard, go to the Workers page.
    - Click the *API tokens* link
    - Click the *Create token* button
    - Click the *Use template* button for Edit Cloudflare Workers
    - Update the permissions to only contain:
      - *Account*, *Worker Scripts*, *Edit*
    - Update the Account Resources to only contain:
      - *Include*, *<YOUR ACCOUNT>*
    - Set a time to live (TTL) for the token, the shorter the better if you're just testing.
</details>

#### Create a binding file

Add a *binding.yaml* file to the *resources* folder:

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
      value: ""
    # Name of the Worker (required)
    - name: workerName
      value: ""
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

Set the values for:

- metadata.name
- spec.metadata.queueName
- spec.metadata.workerName
- spec.metadata.key
- spec.metadata.cfAccountID
- spec.metadata.cfAPIToken

### Create a consumer CloudFlare worker

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

4. Publish the *consumer* worker:

   `cd consumer`

   `wrangler publish`

5. Start a tail to read the log of the consumer worker:

   `wrangler tail --format=json`

### More information

Read about the Dapr [Cloudflare Queues bindings spec](https://v1-10.docs.dapr.io/reference/components-reference/supported-bindings/cloudflare-queues/) on the Dapr docs site.

Any questions or comments about this sample? Please open an issue in this repo or post a question on the [Dapr discord](https://aka.ms/dapr-discord).

