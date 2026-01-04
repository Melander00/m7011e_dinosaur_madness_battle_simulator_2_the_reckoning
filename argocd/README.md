# ArgoCD

This folder contains the files associated with ArgoCD. `applications/` contains all the ArgoCD apps while the rest contains the helm chart for ArgoCD and all its configurations.

An example of an application is:
```
applications/game-master/
│  game-master-dev.yaml
└─ game-master-prod.yaml
```

``` yaml
# game-master-dev.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: game-master-service-dev
  namespace: argocd
spec:
  project: default

  # Source defines where ArgoCD pulls the application from
  source:
    repoURL: 'https://github.com/Melander00/m7011e_dinosaur_madness_battle_simulator_2_the_reckoning.git'
    targetRevision: main          # Git branch or tag
    path: kubernetes/game-master
    helm:
      valueFiles:
        - values/dev-values.yaml       # Environment-specific overrides

  # Destination defines where the app is deployed
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: dev

  # Sync policy controls automated deployment behavior
  syncPolicy:
    automated:
      prune: true       # Delete resources that are removed from git
      selfHeal: true    # Revert manual changes to match git
    syncOptions:
      - CreateNamespace=true   # Automatically create namespace if missing
```

The applications are then started via

```bash
# inside applications/game-master/
argocd app create -f game-master-dev.yaml
```

Now ArgoCD will automatically sync the game-master deployment from the repository to the cluster.