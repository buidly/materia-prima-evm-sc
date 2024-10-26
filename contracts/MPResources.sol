// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

// TODO: ERC1155Burnable, ERC1155Supply
contract MPResources is ERC1155, Ownable, Pausable {
    uint64 public constant NONE = 0;
    uint64 public constant PEDDLER_COIN = 1;
    uint64 public constant GEM = 2;
    uint64 public constant RECIPE = 3;

    uint256 public nextItemId = 2; // Start at 2 to reserve 0 for invalid items and 1 for Peddler Coin

    struct ItemAttributes {
        string name;
        uint64 itemType;
    }

    mapping(uint256 => ItemAttributes) public itemAttributes;

    struct RecipeItem {
        uint256 itemId;  
        uint256 amount; 
    }

    struct RecipeAttributes {
        uint256 homunculiId;
        RecipeItem[] recipeItems;
    }

     mapping(uint256 => RecipeAttributes) public recipes;

    constructor()
        ERC1155("https://game.example/api/item/{id}.json")
        Ownable(msg.sender)
    {
        itemAttributes[PEDDLER_COIN] = ItemAttributes({
            name: "Peddler Coin",
            itemType: PEDDLER_COIN
        });
    }

    function mintPeddlerCoins(address to, uint256 amount) public onlyOwner {
        _mint(to, PEDDLER_COIN, amount, "");
    }

    function createGem(string memory name, uint256 initialSupply) public onlyOwner {
        itemAttributes[nextItemId] = ItemAttributes({
            name: name,
            itemType: GEM
        });

        _mint(msg.sender, nextItemId, initialSupply, "");
        nextItemId++;
    }

    function createRecipe(string memory name, RecipeItem[] memory recipeItems, uint256 homunculiId, uint256 initialSupply) public onlyOwner {
         itemAttributes[nextItemId] = ItemAttributes({
            name: name,
            itemType: RECIPE
        });

        // Assign the recipe requirements
        RecipeAttributes storage recipe = recipes[nextItemId];
        recipe.homunculiId = homunculiId;

        for (uint256 i = 0; i < recipeItems.length; i++) {
            recipe.recipeItems.push(recipeItems[i]);
        }

        _mint(msg.sender, nextItemId, initialSupply, "");
        nextItemId++;
    }

    function transmute(uint256 recipeId) public {
        require(itemAttributes[recipeId].itemType == RECIPE, "Item is not a recipe");

        RecipeAttributes storage recipe = recipes[recipeId];

        // Ensure the user has all the required items in the correct amounts
        for (uint256 i = 0; i < recipe.recipeItems.length; i++) {
            uint256 requiredItemId = recipe.recipeItems[i].itemId;
            uint256 requiredAmount = recipe.recipeItems[i].amount;

            require(balanceOf(msg.sender, requiredItemId) >= requiredAmount, "Not enough required items");
            _burn(msg.sender, requiredItemId, requiredAmount);
        }

        _burn(msg.sender, recipeId, 1);

        // TODO: Mint the homunculus
    }
}
