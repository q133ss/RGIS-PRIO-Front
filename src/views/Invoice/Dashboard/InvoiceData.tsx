import avatar10 from '../../../assets/images/user/avatar-10.jpg'
import avatar2 from '../../../assets/images/user/avatar-2.jpg'
import avatar3 from '../../../assets/images/user/avatar-3.jpg'

const TradingData = [
    {
        label: "Total",
        icon: "▼",
        iconColor: "text-warning",
        percentage: "20.3%",
        euro: "£5678.09",
        totle_invoice: "3",
        lable1: "invoices"
    },
    {
        label: "Paid",
        icon: "▼",
        iconColor: "text-danger",
        percentage: "-8.73%",
        euro: "£5678.09",
        totle_invoice: "5",
        lable1: "invoices"
    },
    {
        label: "Pending",
        icon: "▲",
        iconColor: "text-success",
        percentage: "10.73%",
        euro: "£5678.09",
        totle_invoice: "20",
        lable1: "invoices"
    },
    {
        label: "Overdue",
        icon: "▼",
        iconColor: "text-primary",
        percentage: "-4.73%",
        euro: "£5678.09",
        totle_invoice: "5",
        lable1: "invoices"
    },
]

const RecentInvoice = [
    {
        img: avatar10,
        name: " David Jones",
        code: "- #790841",
        price: "$329.20",
        time: "5 min ago",
    },
    {
        img: avatar2,
        name: "Jenny Jones ",
        code: "- #790841",
        price: "$329.20",
        time: "1 day ago",
    },
    {
        img: avatar3,
        name: "Harry Ben",
        code: " - #790841",
        price: "3 week ago",
        time: "5 min ago",
    },
    {
        img: avatar2,
        name: "Jenifer Vintage ",
        code: "- #790841",
        price: "$329.20",
        time: "3 week ago",
    },
    {
        img: avatar3,
        name: "Stebin Ben",
        code: "- #790841",
        price: "$329.20",
        time: "1 month ago",
    },
]


export { TradingData, RecentInvoice }