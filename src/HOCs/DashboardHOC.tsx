import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Logo from "../assets/user.png.png";
import { NavLink } from "react-router-dom";
import { IconType } from "react-icons";
import { MdDashboard } from "react-icons/md";
import {
  FaBitcoin,
  FaCalendar,
  FaChartLine,
  FaGlobeAfrica,
  FaQuestionCircle,
  FaWallet,
} from "react-icons/fa";
import { IoBarChart } from "react-icons/io5";
import { IoMdPie } from "react-icons/io";
import { AiTwotoneProfile } from "react-icons/ai";
import { BiSolidPurchaseTag } from "react-icons/bi";
import { RiContactsBook2Line } from "react-icons/ri";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: MdDashboard, current: true },
  { name: "Wallet", href: "/wallet", icon: FaWallet, current: false },
];

const data = [
  { name: "Market Place", href: "/market", icon: FaBitcoin, current: true },
  {
    name: "Projects Profile",
    href: "/projects",
    icon: AiTwotoneProfile,
    current: false,
  },
  {
    name: "Recent Purchases",
    href: "/purchases",
    icon: BiSolidPurchaseTag,
    current: false,
  },
];

const pages = [
  {
    name: "Brand Contacts",
    href: "brand-contacts",
    icon: RiContactsBook2Line,
    current: true,
  },
  { name: "Calendar", href: "/calendar", icon: FaCalendar, current: false },
  { name: "FAQ Page", href: "#", icon: FaQuestionCircle, current: false },
];

const charts = [
  { name: "Bar Chart", href: "/bar", icon: IoBarChart, current: true },
  { name: "Pie Chart", href: "/pie", icon: IoMdPie, current: false },
  { name: "Line Chart", href: "/line", icon: FaChartLine, current: false },
  {
    name: "Geography Chart",
    href: "/geography",
    icon: FaGlobeAfrica,
    current: false,
  },
];

const renderData = (item: {
  name: string;
  href: string;
  icon: IconType;
  current: boolean;
}) => (
  <NavLink
    key={item.name}
    to={item.href}
    className={({ isActive, isPending }) =>
      isPending
        ? "pending text-sm"
        : isActive
        ? "active flex text-[#6870FA] px-5 py-2 text-xs"
        : " duration-100 px-5 py-2  text-xs group flex items-center font-medium rounded-md "
    }
    aria-current={item.current ? "page" : undefined}
  >
    <item.icon className={"mr-3 flex-shrink-0 h-4 w-4 "} aria-hidden="true" />
    {item.name}
  </NavLink>
);

import { Bars3Icon } from "@heroicons/react/24/outline";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface Props {
  children: React.ReactNode;
}

export default function Example(props: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/*
        This example requires updating your template:

        ```
        <html class="h-full bg-white">
        <body class="h-full overflow-hidden">
        ```
      */}
      <div className="flex h-screen overflow-auto">
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-40 lg:hidden"
            onClose={setSidebarOpen}
          >
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
            </Transition.Child>

            <div className="fixed inset-0 z-40 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-white focus:outline-none">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                      <button
                        type="button"
                        className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon
                          className="h-6 w-6 text-white"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </Transition.Child>
                  <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
                    <div className="flex flex-shrink-0 items-center px-4">
                      <img
                        className="h-8 w-auto"
                        src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                        alt="Your Company"
                      />
                    </div>
                    <nav aria-label="Sidebar" className="mt-5">
                      <div className="space-y-1 px-2">
                        {navigation.map((item) => (
                          <a
                            key={item.name}
                            href={item.href}
                            className={classNames(
                              item.current
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                              "group flex items-center px-2 py-2 text-base font-medium rounded-md"
                            )}
                          >
                            <item.icon
                              className={classNames(
                                item.current
                                  ? "text-gray-500"
                                  : "text-gray-400 group-hover:text-gray-500",
                                "mr-4 h-6 w-6"
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </a>
                        ))}
                      </div>
                    </nav>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
              <div className="w-14 flex-shrink-0" aria-hidden="true">
                {/* Force sidebar to shrink to fit close icon */}
              </div>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex w-52 flex-col">
            {/* Sidebar component, swap this element with another sidebar if you like */}
            <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-[#1f2a40]">
              <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
                <div className="flex flex-col w-full flex-shrink-0 items-center px-4">
                  <img className="h-12 w-auto" src={Logo} alt="UNC Protocol" />
                  <h2 className="text-2xl font-bold">UNC PROTOCOL</h2>
                  <h4 className="text-[#4CCEAC]">TRADING DATA</h4>
                </div>
                <nav className="mt-6 px-3">
                  <div className="space-y-1">{navigation.map(renderData)}</div>
                  <div className="mt-8">
                    {/* Secondary navigation */}
                    <h3
                      className="px-3 text-sm font-medium text-gray-500"
                      id="desktop-teams-headline"
                    >
                      Data
                    </h3>
                    <div
                      className="mt-1 space-y-1"
                      role="group"
                      aria-labelledby="desktop-teams-headline"
                    >
                      {data.map(renderData)}
                    </div>
                  </div>

                  <div className="mt-8">
                    {/* Secondary navigation */}
                    <h3
                      className="px-3 text-sm font-medium text-gray-00"
                      id="desktop-teams-headline"
                    >
                      Pages
                    </h3>
                    <div
                      className="mt-1 space-y-1"
                      role="group"
                      aria-labelledby="desktop-teams-headline"
                    >
                      {pages.map(renderData)}
                    </div>
                  </div>

                  <div className="mt-8">
                    {/* Secondary navigation */}
                    <h3
                      className="px-3 text-sm font-medium text-gray-500"
                      id="desktop-teams-headline"
                    >
                      Charts
                    </h3>
                    <div
                      className="mt-1 space-y-1"
                      role="group"
                      aria-labelledby="desktop-teams-headline"
                    >
                      {charts.map(renderData)}
                    </div>
                  </div>
                </nav>
              </div>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="lg:hidden">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-1.5">
              <div>
                <img
                  className="h-8 w-auto"
                  src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                  alt="Your Company"
                />
              </div>
              <div>
                <button
                  type="button"
                  className="-mr-3 inline-flex h-12 w-12 items-center justify-center rounded-md text-gray-500 hover:text-gray-900"
                  onClick={() => setSidebarOpen(true)}
                >
                  <span className="sr-only">Open sidebar</span>
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          <div className="relative z-0 flex flex-1 overflow-hidden">
            <main className="relative z-0 flex-1 overflow-y-auto focus:outline-none xl:order-last">
              {props.children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
