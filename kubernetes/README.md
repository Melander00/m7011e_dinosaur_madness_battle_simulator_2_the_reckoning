# Kubernets Deployment

This section contains all the helm charts for the microservices.

General file structure:

```
templates/
│  deployment.yaml
│  ingress.yaml
└─ service.yaml
values/
│  dev-values.yaml
└─ prod-values.yaml
Chart.yaml
```

The charts are used by ArgoCD applications. Once staging tests have been done, create a commit with the tag name from dev-values to prod-values to allow ArgoCD to update the production services.