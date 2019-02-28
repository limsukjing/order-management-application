//check for cookies (users and orders) in the browser
function getCookie(cookieName) {
    if(typeof $.cookie(cookieName) !== 'undefined') {
        return true;
    }
    else {
        return false;
    }
}

//check for user cookie and redirect users to their dashboards
function userDashboard() {
    var isLoggedIn = $.cookie('userCookie');

    if(getCookie('userCookie')) {
        switch(isLoggedIn) {
            case 'manager':
                event.preventDefault();
                $.mobile.changePage('#manager-dashboard', {transition: "fade", changeHash: true});
                break;
            case 'clerk':
                event.preventDefault();
                $.mobile.changePage('#clerk-dashboard', {transition: "fade", changeHash: true});
                break;
            case 'cook':
                event.preventDefault();
                $.mobile.changePage('#cook-dashboard', {transition: "fade", changeHash: true});
                break;
            default:
                event.preventDefault();
                $.mobile.changePage('#loginPage', {transition: "fade", changeHash: true});
        }
    }
}

//retrieve and print inventory details from database
function displayInventory() {
    $.get('/inventory', function(data) {
        var inventoryObj = $.parseJSON(data);

        //loop
        $.each(inventoryObj, function(index, result) {
            $('#'+result.id+' .price').html(result.price);
            $('#'+result.id+' .stock_quantity').html(result.stock_quantity);
            $('#inventory-'+result.id+' .stock_quantity').html(result.stock_quantity);

            //validating the amount of doughnuts that can be added to the cart
            $('#menu-popup-'+result.id+' .menu-quantity').attr({
                'max': result.stock_quantity,
                'min': 1,
            });

            $('#menu-popup-'+result.id+' .menu-quantity').change(function() {
                var invalidChar = ['-', '+', 'e'];
                var value =  $('#menu-popup-'+result.id+' .menu-quantity').val();

                if(value !== invalidChar) {
                    if(value < 0) //when donut added < 0
                    {
                        alert("Invalid amount entered!");
                        $('.add-to-cart-btn').prop('disabled', true);
                        $.mobile.changePage('#clerk-dashboard&ui-state=dialog', {transition: "fade", changeHash: true});
                    }
                    if(value == 0) //when donut added = 0
                    {
                        alert("None of the " + result.name + " is selected!");
                        $('.add-to-cart-btn').prop('disabled', true);
                        $.mobile.changePage('#clerk-dashboard&ui-state=dialog', {transition: "fade", changeHash: true});
                    }
                    if(value > result.stock_quantity) //when donut added > stock quantity
                    {
                        alert("Sorry we only have " + result.stock_quantity + " of " + result.name + " in stock!");
                        $('.add-to-cart-btn').prop('disabled', true);
                        $.mobile.changePage('#clerk-dashboard&ui-state=dialog', {transition: "fade", changeHash: true});
                    }
                    if(value > 0 && value <= result.stock_quantity) //when donut added is valid
                    {
                        $('.add-to-cart-btn').prop('disabled', false);
                    }
                }
            });
        });
    });
}

//retrieve and print sale details from database
function displaySales() {
    $.get('/inventory', function(data) {
        var salesObj = $.parseJSON(data);
        var volumeSum = 0;
        var priceSum = 0;

        $.each(salesObj, function(index, result) {
            $('#sales-'+result.id+' .sales-id').html(result.id);
            $('#sales-'+result.id+' .sales-name').html(result.name);
            $('#sales-'+result.id+' .sales-volume').html(result.sales_volume);
            $('#sales-'+result.id+' .sales-price').html("&euro;" + result.sales_price.toFixed(2));

            volumeSum += result.sales_volume; //calculating total price
            priceSum += result.sales_price; //calculating total items
        });

        $('.salesItem').html("Total sales volume: " + volumeSum + " doughnuts");
        $('.salesPrice').html("Total sales price: &euro;" + priceSum.toFixed(2));
    });
}

$(document).ready(function() {
    displayInventory();

    displaySales();

    //handle user registration
    $('#register-btn').click(function() {
        event.preventDefault();

        var nu = $('#new-username').val();
        var np = $('#new-password').val();
        var np2 = $('#new-password2').val();

        if(nu !== 'manager' && nu !== 'clerk' && nu !== 'cook') {
            alert("Valid usernames are: manager, clerk or cook");
        }
        else {
            $.post('/register', {
                newUsername: nu,
                newPassword: np,
                newPassword2: np2
            })
            .done(function(data) {
                if(data == 'successful') {
                    alert("You have been successfully registered as " + nu + ", please login now.");
                    $.mobile.changePage('#loginPage', {transition: "fade", changeHash: true});
                }
                else {
                    var errorObj = $.parseJSON(data);

                    //loop
                    $.each(errorObj, function(index, result) {
                        alert(result.msg)
                    });
                }
            });
        }
    });

    //validate user login details
    $('#login-btn').click(function() {
        event.preventDefault();

        var u = $('#username').val();
        var p = $('#password').val();

        $.post('/login', {
            username: u,
            password: p
        })
        .done(function(data) {
            if(data == 'authorized') {
                alert("You have successfully logged in as " + u + ".");
                userDashboard();
                $('.welcome-username').html("Welcome back " + u + "!");
            }
            if(data == 'unauthorized') {
                alert("Unauthorized access.");
            }
            else {
                var errorObj = $.parseJSON(data);

                //loop
                $.each(errorObj, function(index, result) {
                    alert(result.msg)
                });
            }
        });
    });

    //show or hide password on register page
    $('#showPassword-cb').click(function() {
        if($('#new-password').attr('type') == 'password' && $('#new-password2').attr('type') == 'password') {
            $('#new-password').attr('type', 'text');
            $('#new-password2').attr('type', 'text');
        }
        else {
            $('#new-password').attr('type', 'password');
            $('#new-password2').attr('type', 'password');
        }
    });

    //show or hide password on login page
    $('#showPassword-cb2').click(function() {
        if($('#password').attr('type') == 'password') {
            $('#password').attr('type', 'text');
        }
        else {
            $('#password').attr('type', 'password');
        }
    });

    //log user out and delete the existing cookies (users and orders)
    $('.nav-logout-btn').click(function() {
        event.preventDefault();

        alert("You have successfully logged out.");
        $.mobile.changePage('#loginPage', {transition: "fade", changeHash: true});
        $.removeCookie('userCookie');
        $.removeCookie('orderCookie');
    });

    //CLERK: add order to cart
    $('.add-to-cart-btn').click(function() {
        event.preventDefault();

        //array storing quantity for each donut flavor
        //calculate the total items and price for each order
        var checkoutCart = {'donut1': 0, 'donut2': 0, 'donut3': 0, 'donut4': 0, 'donut5': 0, 'totalItem': 0, 'totalPrice': 0};

        if(getCookie('orderCookie')) {
            checkoutCart = JSON.parse($.cookie('orderCookie'));
        }

        if(this.id == 'menu-add-1') {
            var mq1 = parseInt($('#menu-popup-1 .menu-quantity').val());
            var price1 = parseFloat($('#1 .price').html());

            checkoutCart['donut1'] = parseInt(checkoutCart['donut1']) + mq1;
            checkoutCart['totalItem'] = parseInt(checkoutCart['totalItem']) + mq1;
            checkoutCart['totalPrice'] = parseFloat(checkoutCart['totalPrice'].toFixed(2)) + price1 * mq1;
            alert("Added " + mq1 + " Original Glazed to the cart.");
            $.mobile.changePage('#clerk-dashboard', {transition: "fade", changeHash: true});
        }
        else if(this.id == 'menu-add-2') {
            var mq2 = parseInt($('#menu-popup-2 .menu-quantity').val());
            var price2 = parseFloat($('#2 .price').html());

            checkoutCart['donut2'] = parseInt(checkoutCart['donut2']) + mq2;
            checkoutCart['totalItem'] = parseInt(checkoutCart['totalItem']) + mq2;
            checkoutCart['totalPrice'] = parseFloat(checkoutCart['totalPrice'].toFixed(2)) + price2 * mq2;
            alert("Added " + mq2 + " S'Mores to the cart.");
            $.mobile.changePage('#clerk-dashboard', {transition: "fade", changeHash: true});
        }
        else if(this.id == 'menu-add-3') {
            var mq3 = parseInt($('#menu-popup-3 .menu-quantity').val());
            var price3 = parseFloat($('#3 .price').html());

            checkoutCart['donut3'] = parseInt(checkoutCart['donut3']) + mq3;
            checkoutCart['totalItem'] = parseInt(checkoutCart['totalItem']) + mq3;
            checkoutCart['totalPrice'] = parseFloat(checkoutCart['totalPrice'].toFixed(2)) + price3 * mq3;
            alert("Added " + mq3 + " Strawberries & Kreme to the cart.");
            $.mobile.changePage('#clerk-dashboard', {transition: "fade", changeHash: true});
        }
        else if(this.id == 'menu-add-4') {
            var mq4 = parseInt($('#menu-popup-4 .menu-quantity').val());
            var price4 = parseFloat($('#4 .price').html());

            checkoutCart['donut4'] = parseInt(checkoutCart['donut4']) + mq4;
            checkoutCart['totalItem'] = parseInt(checkoutCart['totalItem']) + mq4;
            checkoutCart['totalPrice'] = parseFloat(checkoutCart['totalPrice'].toFixed(2)) + price4 * mq4;
            alert("Added " + mq4 + " Salted Caramel Cheesecake to the cart.");
            $.mobile.changePage('#clerk-dashboard', {transition: "fade", changeHash: true});
        }
        else if(this.id == 'menu-add-5') {
            var mq5 = parseInt($('#menu-popup-5 .menu-quantity').val());
            var price5 = parseFloat($('#5 .price').html());

            checkoutCart['donut5'] = parseInt(checkoutCart['donut5']) + mq5;
            checkoutCart['totalItem'] = parseInt(checkoutCart['totalItem']) + mq5;
            checkoutCart['totalPrice'] = parseFloat(checkoutCart['totalPrice'].toFixed(2)) + price5 * mq5;
            alert("Added " + mq5 + " Cookie Dream to the cart.");
            $.mobile.changePage('#clerk-dashboard', {transition: "fade", changeHash: true});
        }

        $.cookie('orderCookie', JSON.stringify(checkoutCart));
    });

    //CLERK: checkout and review order
    $(".nav-checkout-btn").click(function() {
        if(getCookie('orderCookie')) {
            checkoutCart = JSON.parse($.cookie('orderCookie'));

            if(checkoutCart.totalItem == 0) {
                event.preventDefault();
                alert("Your cart is empty. Please add some doughnuts to the cart to view this page!");
            } else {
                $('.review-item').html("Total item: " + checkoutCart.totalItem);
                $('.review-price').html("Total price: &euro;" + (checkoutCart.totalPrice).toFixed(2));

                if(checkoutCart['donut1'] > 0) {
                    $('#checkout_1 .cart_quantity').html(checkoutCart['donut1']);
                }
                else {
                    $('#checkout_1').hide();
                }

                if(checkoutCart['donut2'] > 0) {
                    $('#checkout_2 .cart_quantity').html(checkoutCart['donut2']);
                }
                else {
                    $('#checkout_2').hide();
                }

                if(checkoutCart['donut3'] > 0) {
                    $('#checkout_3 .cart_quantity').html(checkoutCart['donut3']);
                }
                else {
                    $('#checkout_3').hide();
                }

                if(checkoutCart['donut4'] > 0) {
                    $('#checkout_4 .cart_quantity').html(checkoutCart['donut4']);
                }
                else {
                    $('#checkout_4').hide();
                }

                if(checkoutCart['donut5'] > 0) {
                    $('#checkout_5 .cart_quantity').html(checkoutCart['donut5']);
                }
                else {
                    $('#checkout_5').hide();
                }
            }
        } else {
            event.preventDefault();
            alert("Your cart is empty. Please add some doughnuts to the cart to view this page!");
        }
    });

    //CLERK: preventing user from going back to menu page if order transaction is not completed
    $('.nav-menu-btn').click(function() {
        if(getCookie('orderCookie')) {
            var checkoutCart = JSON.parse($.cookie('orderCookie'));

            if (checkoutCart.totalItem > 0) {
                event.preventDefault();
                alert("Please complete your order review!");
            }
        }
    });

    //CLERK: checkout and send order details in the database
    $('#payment-btn').click(function() {
        alert("Thank you for choosing Crispy Cream! Enjoy your doughnuts.");
        $.post('/order').done(function(data) {
            console.log(data);
            $.removeCookie('orderCookie');
        });
        location.reload();
        $.mobile.changePage('#clerk-dashboard', {transition: "fade", changeHash: true});
    });

    //CLERK: let user remove all the items in the cart
    $('#remove-btn').click(function() {
        $.removeCookie('orderCookie');
        alert("All items have been successfully removed from the cart.");
        location.reload();
        $.mobile.changePage('#clerk-dashboard', {transition: "fade", changeHash: true});
    });

    //COOK: update donut stock
    $('.add-to-inventory-btn').click(function() {
        event.preventDefault();

        //array storing added quantity for each donut flavor
        var stockQuantity = {'donut1': 0, 'donut2': 0, 'donut3': 0, 'donut4': 0, 'donut5': 0};
        var invalidChar = ['-', '+', 'e'];

        if(this.id == 'inventory-add-1') {
            var iq1 = $('#inventory-popup-1 .inventory-quantity').val();

            if(iq1 !== invalidChar) {
                if(iq1 <= 0 || iq1 == invalidChar) {
                    alert("Invalid amount entered!");
                    $.mobile.changePage('#cook-dashboard&ui-state=dialog', {transition: "fade", changeHash: true});
                }
                else {
                    stockQuantity['donut1'] = parseInt(stockQuantity['donut1']) + iq1;
                    alert("Added " + iq1 + " Original Glazed to the inventory.");
                    $.mobile.changePage('#cook-dashboard', {transition: "fade", changeHash: true});
                }
            }
        }
        else if(this.id == 'inventory-add-2') {
            var iq2 = $('#inventory-popup-2 .inventory-quantity').val();

            if(iq2 !== invalidChar) {
                if(iq2 <= 0) {
                    alert("Invalid amount entered!");
                    $.mobile.changePage('#cook-dashboard&ui-state=dialog', {transition: "fade", changeHash: true});
                }
                else {
                    stockQuantity['donut2'] = parseInt(stockQuantity['donut2']) + iq2;
                    alert("Added " + iq2 + " S'Mores to the inventory.");
                    $.mobile.changePage('#cook-dashboard', {transition: "fade", changeHash: true});
                }
            }
        }
        else if(this.id == 'inventory-add-3') {
            var iq3 = $('#inventory-popup-3 .inventory-quantity').val();

            if(iq3 !== invalidChar) {
                if(iq3 <= 0) {
                    alert("Invalid amount entered!");
                    $.mobile.changePage('#cook-dashboard&ui-state=dialog', {transition: "fade", changeHash: true});
                }
                else {
                    stockQuantity['donut3'] = parseInt(stockQuantity['donut3']) + iq3;
                    alert("Added " + iq3 + " Strawberries & Kreme to the inventory.");
                    $.mobile.changePage('#cook-dashboard', {transition: "fade", changeHash: true});
                }
            }
        }
        else if(this.id == 'inventory-add-4') {
            var iq4 = $('#inventory-popup-4 .inventory-quantity').val();

            if(iq4 !== invalidChar) {
                if(iq4 <= 0) {
                    alert("Invalid amount entered!");
                    $.mobile.changePage('#cook-dashboard&ui-state=dialog', {transition: "fade", changeHash: true});
                }
                else {
                    stockQuantity['donut4'] = parseInt(stockQuantity['donut4']) + iq4;
                    alert("Added " + iq4 + " Salted Caramel Cheesecake to the inventory.");
                    $.mobile.changePage('#cook-dashboard', {transition: "fade", changeHash: true});
                }
            }
        }
        else if(this.id == 'inventory-add-5') {
            var iq5 = $('#inventory-popup-5 .inventory-quantity').val();

            if(iq5 !== invalidChar) {
                if(iq5 <= 0) {
                    alert("Invalid amount entered!");
                    $.mobile.changePage('#cook-dashboard&ui-state=dialog', {transition: "fade", changeHash: true});
                }
                else {
                    stockQuantity['donut5'] = parseInt(stockQuantity['donut5']) + iq5;
                    alert("Added " + iq5 + " Cookie Dream to the inventory.");
                    $.mobile.changePage('#cook-dashboard', {transition: "fade", changeHash: true});
                }
            }
        }

        var sq = JSON.stringify(stockQuantity);

        $.post('/inventory', {
            stock: sq
        })
        .done(function(data) {
            console.log(data);
            displayInventory();
        });
    });
});

