import foodImg from '../../assets/images/widget/img-food.png';
import travelImg from '../../assets/images/widget/img-travel.png';
import shoppingImg from '../../assets/images/widget/img-shoping.png'
import healthCareImg from '../../assets/images/widget/img-helth.png'

import card1 from '../../assets/images/widget/img-card-1.png'
import card2 from '../../assets/images/widget/img-card-2.png'

import avatar11 from '../../assets/images/user/avatar-1.jpg'
import avatar22 from '../../assets/images/user/avatar-2.jpg'
import starbugs from '../../assets/images/widget/img-acitivity-3.svg'

import avatar1 from '../../assets/images/user/avatar-1.jpg'
import avatar2 from '../../assets/images/user/avatar-2.jpg'
import avatar3 from '../../assets/images/user/avatar-3.jpg'
import avatar4 from '../../assets/images/user/avatar-4.jpg'
import avatar5 from '../../assets/images/user/avatar-5.jpg'


const ExpensTypeData = [
    {
        id: 6,
        img: foodImg,
        catagory: "Food & Drink",
        percentage: "65%",
        total_amount: "$1000",
    },
    {
        id: 7,
        img: travelImg,
        catagory: "Travel",
        percentage: "30%",
        total_amount: "$400",
    },
    {
        id: 8,
        img: shoppingImg,
        catagory: "Shopping",
        percentage: "52%",
        total_amount: "$900",
    },
    {
        id: 9,
        img: healthCareImg,
        catagory: "Healthcare",
        percentage: "26%",
        total_amount: "$250",
    }
]

const AccountData = [
    {
        img: card1,
        type: "Active",
        amount: "12,920.000",
        currency: "US Dollar"
    },
    {
        img: card2,
        type: "Active",
        amount: "12,920.000",
        currency: "US Dollar",
    }
]

const QuickTransferData = [
    {
        img: avatar11,
        shope: "Ashton Cox",
        date: "11th Sep 2020",
        price: "-$26",
        textColor: "text-danger"
    },
    {
        img: avatar22,
        shope: "Starbucks Cafe",
        date: "11th Sep 2020",
        price: "-$750.00",
        textColor: "text-success"
    },
    {
        img: starbugs,
        shope: "Starbucks Cafe",
        date: "11th Sep 2020",
        price: "-$26",
        textColor: "text-danger"
    },
]

const TransactionData = [
    {
        img: avatar1,
        name: "Airi Satou",
        categoty: "Salary Payment",
        date: "2023/02/07",
        time: "09:05 PM",
        amount: "$950.54",
        status: "Completed",
        textColor: "text-bg-success"
    },
    {
        img: avatar2,
        name: "Ashton Cox",
        categoty: "Project Payment",
        date: "2023/02/01",
        time: "02:14 PM",
        amount: "$520.30",
        status: "Completed",
        textColor: "text-bg-success"
    },
    {
        img: avatar3,
        name: "Bradley Greer",
        categoty: "You Tube Subscribe",
        date: "2023/01/22",
        time: "10:32 AM",
        amount: "$100.00",
        status: "Pending",
        textColor: "text-bg-warning"
    },
    {
        img: avatar4,
        name: "Brielle Williamson",
        categoty: "Slary Payment",
        date: "2023/02/07",
        time: "09:05 PM",
        amount: "$760.25",
        status: "In Progress",
        textColor: "text-bg-primary"
    },
    {
        img: avatar5,
        name: "Airi Satou",
        categoty: "Spotify Subscribe",
        date: "2023/02/07",
        time: "09:05 PM",
        amount: "$60.05",
        status: "Canceled",
        textColor: "text-bg-danger"
    },
]


export { ExpensTypeData, AccountData, QuickTransferData, TransactionData }