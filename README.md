
# Broker - Engine scalling test

## Architecture

Broker - a simple service that opens a TCP server, registers egine TCP connections through a simple handshake, and accepts engine heartbeat messages.

Engine - makes a connection to the Broker, and sends sequenced heartbeat messages.

Kubernetes
* The Broker is sceduled as a pod (with no deployment), with a headless service that defines a selector to the POD, so the DNS points directly to the POD IP (clusterIP: None) & so there is no load-balancing (kube-proxy does not handle these Services).
* The Engine is a Deployment, that manages scale


## Build and Run

### Create Docker Image

Optional: you can just use a pre-build image already referenced in the deployment.yaml

```
new_val="2.8"
docker build -t khowling/broker-engine:$new_val .
docker push khowling/broker-engine:$new_val
sed -i "s/broker-engine:2.7/broker-engine:${new_val}/g" deployment.yaml
```

### Create AKS Cluster

This sets max-pods to 250 per node, allowing smaller clusters to scales to >2000 engines

Optional: or use your own

```
az group create kh-aks-loadtest

az aks create \
  --resource-group kh-aks-loadtest \
  --name kh-lt2  \
  --node-count 5 \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --max-pods 250  \
  --node-vm-size Standard_D2s_v3 \
  --network-plugin azure \
  --enable-vmss

```

Scale 

```
az aks scale -n kh-lt2 -g kh-aks-loadtest -c 15
```

```
az aks get-credentials -n kh-lt2 -g kh-aks-loadtest
```

### Deploy and Test application

```
kubectl apply -f deployment.yaml
```

```
kubectl scale --replicas=1500 deployment/engine
```

```
kubectl logs broker -f
```

### Clear up 

```
k delete deployment engine
k delete pod broker
```