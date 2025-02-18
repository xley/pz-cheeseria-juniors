import React, { useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useCookies } from 'react-cookie';
import axios from 'axios';
// Components
import Item from './Cart/Item/Item';
import Cart from './Cart/Cart';
import Drawer from '@material-ui/core/Drawer';
import LinearProgress from '@material-ui/core/LinearProgress';
import Grid from '@material-ui/core/Grid';
import AddShoppingCartIcon from '@material-ui/icons/AddShoppingCart';
import RestoreIcon from '@material-ui/icons/Restore';
import Badge from '@material-ui/core/Badge';
import { Dialog, Toolbar, Typography } from '@material-ui/core';
import DialogItem from './Dialog/DialogItem/DialogItem';
import PurchasesList from './Purchases/PurchasesList/PurchasesList';
import { calculateCartTotalAmount, calculateCartTotalPrice, createUuid } from './helpers/helpers';
// Styles
import { Wrapper, StyledButton, StyledAppBar, HeaderTypography } from './App.styles';
// Types
export type CartItemType = {
  id: number;
  category: string;
  description: string;
  image: string;
  price: number;
  title: string;
  amount: number;
};

export type PurchaseType = {
  id: string,
  userId: string,
  totalPrice: number,
  totalItems: number,
  dateTime: string,
  cheeses: CartItemType[]
}

const getCheeses = async (): Promise<CartItemType[]> =>
  await (await fetch(`api/cheeses`)).json();

const createPurchase = async (purchase: PurchaseType) => {
  const { data: response } = await axios.post('/api/purchase', {
    purchase
  });
  return response;
};

const fetchPurchases = async (userId: string): Promise<PurchaseType[]> => {
  const { data: response } = await axios.get(`/api/purchases/${userId}`);
  return response;
};

const App = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([] as CartItemType[]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = useState<CartItemType | undefined>();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cookies, setCookie] = useCookies(['user']);
  const [purchasesOpen, setPurchasesOpen] = useState(false);

  useEffect(() => {
    fetchCheesesMutation();
    const userId = cookies.ID;
    if (!userId) {
      console.log('Reset userId');
      const userId = createUuid();
      setCookie('ID', userId, { path: '/' });
    }
  }, []);
  const { data: cheeses, mutate: fetchCheesesMutation } = useMutation(
    getCheeses, {
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: () => {
      setLoading(false);
    },
    onError: () => {
      setLoading(false);
      setError(true);
    }
  });

  const createPurchaseMutation = useMutation(
    createPurchase, {
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: () => {
      setLoading(false);
    },
    onError: () => {
      setLoading(false);
      setError(true);
    }
  });

  const { data: purchases, mutate: fetchPurchasesMutation } = useMutation(
    fetchPurchases, {
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: () => {
      setLoading(false);
    },
    onError: () => {
      setLoading(false);
      setError(true);
    }
  });

  const getTotalItems = (items: CartItemType[]) =>
    items.reduce((ack: number, item) => ack + item.amount, 0);

  const handleAddToCart = (clickedItem: CartItemType) => {
    setCartItems(prev => {
      // 1. Is the item already added in the cart?
      const isItemInCart = prev.find(item => item.id === clickedItem.id);

      if (isItemInCart) {
        return prev.map(item =>
          item.id === clickedItem.id
            ? { ...item, amount: item.amount + 1 }
            : item
        );
      }
      // First time the item is added
      return [...prev, { ...clickedItem, amount: 1 }];
    });
  };

  const handleRemoveFromCart = (id: number) => {
    setCartItems(prev =>
      prev.reduce((ack, item) => {
        if (item.id === id) {
          if (item.amount === 1) return ack;
          return [...ack, { ...item, amount: item.amount - 1 }];
        } else {
          return [...ack, item];
        }
      }, [] as CartItemType[])
    );
  };

  const handleItemSelect = (item: CartItemType | undefined) => (event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handlePurchase = async () => {
    // Refactor cart Items into purchase type
    const purchase: PurchaseType = {
      id: createUuid(),
      userId: cookies.ID,
      totalPrice: calculateCartTotalPrice(cartItems),
      totalItems: calculateCartTotalAmount(cartItems),
      dateTime: new Date().toDateString(),
      cheeses: cartItems
    }
    // Push purchases to Purchases.json
    await createPurchaseMutation.mutateAsync(purchase);
    // clear cart items
    setCartItems([] as CartItemType[]);
  }

  const handlePurchasesOpen = () => {
    fetchPurchasesMutation(cookies.ID);
    setPurchasesOpen(true);
  }

  const handlePurchasesClose = () => {
    setPurchasesOpen(false);
  }

  if (loading) return <LinearProgress />;
  if (error) return <div>Something went wrong ...</div>;

  return (

    <Wrapper>
      <StyledAppBar position="static">
        <Toolbar>
          <Grid
            container
            direction="row"
            justify="space-between"
            alignItems="center"
          >
            <StyledButton onClick={() => handlePurchasesOpen()} data-cy='recent-purchases-button'>
              <RestoreIcon />
              <Typography variant="subtitle2">
                Recent Purchases
              </Typography>
            </StyledButton>

            <HeaderTypography variant="h3" noWrap>
              Welcome to Patient Zero's Cheeseria
            </HeaderTypography>

            <StyledButton onClick={() => setCartOpen(true)} data-cy='shopping-cart-button'>
              <Badge
                badgeContent={getTotalItems(cartItems)}
                color='error'
                data-cy="shopping-cart-badge-count">
                <AddShoppingCartIcon />
              </Badge>

              <Typography variant="subtitle2">
                Cart
              </Typography>
            </StyledButton>

          </Grid>
        </Toolbar>
      </StyledAppBar>

      <Drawer anchor='left' onClose={handlePurchasesClose} open={purchasesOpen} data-cy='purchases-drawer'>
        <PurchasesList items={purchases} />
      </Drawer>

      <Drawer anchor='right' open={cartOpen} onClose={() => setCartOpen(false)} data-cy='cart-drawer'>
        <Cart
          cartItems={cartItems}
          addToCart={handleAddToCart}
          removeFromCart={handleRemoveFromCart}
          onPurchase={handlePurchase}
          onClose={() => setCartOpen(false)}
        />
      </Drawer>

      <Dialog onClose={() => setDialogOpen(false)} open={dialogOpen}>
        {selectedItem && <DialogItem item={selectedItem} handleAddToCart={handleAddToCart} />}
      </Dialog>

      <Grid container spacing={3}>
        {cheeses?.map(item => (
          <Grid item key={item.id} xs={12} sm={4}>
            <Item item={item} handleAddToCart={handleAddToCart} handleItemSelect={handleItemSelect} />
          </Grid>
        ))}
      </Grid>
    </Wrapper>

  );
};

export default App;
