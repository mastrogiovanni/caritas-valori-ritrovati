# README

In order to produce the `data/import.csv` file that can be given to Shopify in 
order to update the store you need to insert in the `data/` directory:
* a giacenza.csv (with updated list of products)
* a imgs/ (with products names)

Imgs directory is needed in order to update the list of product with existing images.

## How to run

You can do:

```
docker run -v $(pwd)/data:/data mastrogiovanni/caritas-valori-ritrovati:latest
```