
# Process connectivity scalling test

## Architecture

Server - a simple service that opens a TCP server, registers egine TCP connections through a simple handshake, and accepts client heartbeat messages.

Client - makes a connection to the Server, and sends sequenced heartbeat messages.

Kubernetes
* The Server is sceduled as a pod (with no deployment), with a headless service that defines a selector to the POD, so the DNS points directly to the POD IP (clusterIP: None) & so there is no load-balancing (kube-proxy does not handle these Services).
* The Client is a Deployment, that manages scale


## Build and Run

### Create Docker Image

Optional: you can just use a pre-build image already referenced in the deployment.yaml

```
new_val="2.11"
docker build -t khowling/broker-engine:$new_val .
docker push khowling/broker-engine:$new_val
sed -i "s/broker-engine:2.10/broker-engine:${new_val}/g" deployment.yaml
```

### Create AKS Cluster

This sets max-pods to 250 per node, allowing smaller clusters to scales to >2000 engines

(Optional: or use your own)

```
RG=<resource-group-name>
CN=<cluster-name>
```

```
az group create -n $RG

az aks create \
  --resource-group $RG \
  --name $CN  \
  --node-count 2 \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --max-pods 250  \
  --network-plugin kubenet \
  --vm-set-type VirtualMachineScaleSets  \
  --load-balancer-sku standard \
  --node-vm-size Standard_D2s_v3
```

(Optional) to add low-pri nodepool - the template will automatically `taint` the nodes in the pool with "pooltype=lowpri:NoSchedule", the taint effect `NoSchedule` means that no pod will be able to schedule onto the nodes unless it has a matching toleration.  (FYI `PreferNoSchedule` is a “soft” version of NoSchedule)

```
az group deployment create \
    --resource-group $RG \
    --template-file lowpri.json \
    --parameters clusterName="$CN"
```

Locate & tolerate your PODs by adding in the spec (at the end of the `deplyoment.yaml`):

```
      nodeSelector:
        agentpool: agentpool
      tolerations:
      - key: "pooltype"
        operator: "Equal"
        value: "lowpri"
```


Scale (without low-pri)

```
az aks scale -n $CN -g $RG -c 15
```

Scale (with low-pri)

https://docs.microsoft.com/en-us/azure/aks/cluster-autoscaler#use-the-cluster-autoscaler-with-multiple-node-pools-enabled

Engine resource


1 CPU == Azure vCORE = (Standard_DS2_v2 == 2)
Mem (standard_DS2_v2 == 7113156Ki)

Add to deployment.yaml
```
        resources:
          limits:
            memory: "16Mi"
            cpu: "5m"
```
To see the status
```
kubectl -n kube-system describe configmap cluster-autoscaler-status
```

### Deploy and Test application

```
az aks get-credentials -n $CN -g $RG
```

```
kubectl apply -f deployment.yaml
```

```
kubectl scale --replicas=400 deployment/engine
```

```
kubectl logs broker -f
```

### Simulate 5 minutes of load

to get the <IP> run `kubectl get svc brokers-instruct`

```
curl <IP>:8080/dowork?time=300000
curl <IP>:8080/kill?code=0
```

look at the cluster with 

```
kubectl top nodes
kubectl top pods
```

### Clear up 

```
k delete deployment engine
k delete pod broker
```
