# Monitoring Design Template

**Group nr:** 

**Components** (list 3-4 main parts/services of your system):
1. Game Master
2. Matchmaking
3. Leaderboard
4. Friends

---

## Monitoring Strategy

Fill out this table to design your monitoring approach:

| WHAT TO MONITOR | WHY IT MATTERS (user impact) | HOW IT PREVENTS DISASTER |
|-----------------|------------------------------|--------------------------|
| 1. Cluster CPU and memory usage. | The game loop is dependant on starting new pods with the game server on. Without enough resources we can't start a new match. | We are able to properly handle many users at the same time. For example, we can scale the cluster to get more resources or just deny new matches to keep our other services alive. |
| 2. Matchmaking failure | Users can't play matches if they aren't matchmaked with someone. | The ability to rollback faulty matchmaking deployments before too many users are affected. |
| 3.  | | |
| 4. | | |
| 5. | | |

---

## Failure Scenario Analysis

**Pick one thing or more that could break in your system:**

What could break? 

When two players start a match, the game master will start a pod with the game server. If the cluster doesn't have enough resources to handle another game server some sort of failure will appear.

**How would your monitoring detect it?**
If we monitor 
---

## Guiding Questions

When designing your monitoring, consider:

### The Four Golden Signals
- **Latency:** How long do operations take?
- **Traffic:** How much demand is on your system?
- **Errors:** What's the rate of failed requests?
- **Saturation:** How "full" is your system?

### Black Box vs White Box
- **Black Box:** Can users access your service? (external perspective)
- **White Box:** What's happening inside? (internal metrics)

### Dependencies
- What external services does your system rely on?
- What happens if they fail?
- How would you know?

---

## Tips for Good Monitoring

- **Monitor what users care about** - not just technical metrics  
- **Make alerts actionable** - if you can't do anything, don't alert  
- **Monitor dependencies** - external APIs, etc.
- **Test your monitoring** - make sure alerts actually fire  
- **Think about cascading failures** - one thing breaks, what else fails? Both internal and external dependencies can cause cascades

